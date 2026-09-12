import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateReadState } from '@/lib/email/microsoft-graph'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCeo()
    const { id } = await params
    const body = await request.json()
    const isRead = Boolean(body.is_read)
    const supabase = createAdminClient()

    // 1. Fetch message and its account
    const { data: message, error: msgErr } = await supabase
      .from('email_messages')
      .select('id, provider_message_id, thread_id, is_read, email_account:email_accounts(email_address)')
      .eq('id', id)
      .single()

    if (msgErr || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // 2. Update local DB
    await supabase
      .from('email_messages')
      .update({ is_read: isRead, updated_at: new Date().toISOString() })
      .eq('id', id)

    // 3. Update thread unread count
    const delta = isRead ? (message.is_read ? 0 : -1) : message.is_read ? 1 : 0
    if (delta !== 0) {
      const { data: thread } = await supabase
        .from('email_threads')
        .select('unread_count')
        .eq('id', message.thread_id)
        .single()

      if (thread) {
        const newUnread = Math.max(0, (thread.unread_count || 0) + delta)
        await supabase
          .from('email_threads')
          .update({ unread_count: newUnread })
          .eq('id', message.thread_id)
      }
    }

    // 4. Try updating in Microsoft Graph in background
    const mailboxEmail = (message.email_account as unknown as { email_address: string })?.email_address
    if (mailboxEmail && message.provider_message_id) {
      updateReadState(mailboxEmail, message.provider_message_id, isRead).catch((err) => {
        console.warn('[Mark Read] Failed to sync read state with Graph:', err)
      })
    }

    return NextResponse.json({ success: true, is_read: isRead })
  } catch (err) {
    return toErrorResponse(err)
  }
}
