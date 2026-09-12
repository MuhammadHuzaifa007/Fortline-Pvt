import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAttachment } from '@/lib/email/microsoft-graph'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> },
) {
  try {
    await requireCeo()
    const { messageId, attachmentId } = await params
    const supabase = createAdminClient()

    // 1. Fetch message and mailbox info
    const { data: message, error: msgErr } = await supabase
      .from('email_messages')
      .select('id, provider_message_id, email_account:email_accounts(email_address)')
      .eq('id', messageId)
      .single()

    if (msgErr || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const mailboxEmail = (message.email_account as unknown as { email_address: string })?.email_address
    if (!mailboxEmail) {
      return NextResponse.json({ error: 'Mailbox account not found' }, { status: 404 })
    }

    // 2. Fetch attachment from Microsoft Graph
    const attachment = await getAttachment(
      mailboxEmail,
      message.provider_message_id,
      attachmentId,
    )

    if (!attachment.contentBytes) {
      return NextResponse.json({ error: 'Attachment content is empty or unavailable' }, { status: 404 })
    }

    // 3. Return decoded binary buffer with correct headers
    const buffer = Buffer.from(attachment.contentBytes, 'base64')

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': attachment.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.name || 'attachment')}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
