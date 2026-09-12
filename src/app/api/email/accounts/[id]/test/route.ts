import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMailboxProfile } from '@/lib/email/microsoft-graph'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireCeo()
    const { id } = await params
    const supabase = createAdminClient()

    const { data: account, error: accError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', id)
      .single()

    if (accError || !account) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 })
    }

    try {
      const profile = await getMailboxProfile(account.email_address)

      // Connection succeeded! Update statuses
      await supabase
        .from('email_accounts')
        .update({
          connection_status: 'connected',
          authorization_status: 'authorized',
          microsoft_user_id: profile?.id || null,
          last_error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      await supabase.from('email_audit_log').insert({
        actor_email: ctx.userEmail || 'ceo@fortline.net',
        action: 'test_connection',
        email_account_id: id,
        mailbox_email: account.email_address,
        result: 'success',
      })

      return NextResponse.json({
        success: true,
        message: `Successfully connected to mailbox ${account.email_address}`,
        profile,
      })
    } catch (testErr: unknown) {
      const errMsg = (testErr as Error).message || 'Connection test failed'

      await supabase
        .from('email_accounts')
        .update({
          connection_status: 'error',
          authorization_status: 'unauthorized',
          last_error_at: new Date().toISOString(),
          last_error_message: errMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      await supabase.from('email_audit_log').insert({
        actor_email: ctx.userEmail || 'ceo@fortline.net',
        action: 'test_connection',
        email_account_id: id,
        mailbox_email: account.email_address,
        result: 'failure',
        error_message: errMsg,
      })

      return NextResponse.json(
        {
          success: false,
          error: errMsg,
          suggestion:
            'Please verify Microsoft Entra App Registration credentials in .env, Mail.ReadWrite application permissions, and Exchange Online RBAC configuration.',
        },
        { status: 400 },
      )
    }
  } catch (err) {
    return toErrorResponse(err)
  }
}
