import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export interface EmailAlert {
  id: string
  type: 'overdue_response' | 'mailbox_disconnected' | 'sync_failure' | 'subscription_expired'
  severity: 'warning' | 'critical'
  title: string
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export async function GET() {
  try {
    await requireCeo()
    const supabase = createAdminClient()
    const alerts: EmailAlert[] = []

    // 1. Overdue response alerts
    const { data: overdueThreads } = await supabase
      .from('email_threads')
      .select('id, subject, client_email, client_name, last_message_at, sales_member:fortline_sales_members(name)')
      .eq('is_overdue', true)
      .eq('status', 'open')
      .order('last_message_at', { ascending: true })
      .limit(50)

    for (const t of overdueThreads || []) {
      const repName = (t.sales_member as unknown as { name: string })?.name || 'Sales Rep'
      alerts.push({
        id: `overdue-${t.id}`,
        type: 'overdue_response',
        severity: 'critical',
        title: `Overdue Email from ${t.client_name || t.client_email}`,
        description: `No response sent by ${repName} on "${t.subject || 'Untitled'}".`,
        timestamp: t.last_message_at,
        metadata: { thread_id: t.id },
      })
    }

    // 2. Mailbox disconnected / error alerts
    const { data: failingAccounts } = await supabase
      .from('email_accounts')
      .select('id, email_address, connection_status, last_error_message, last_error_at, sales_member:fortline_sales_members(name)')
      .or('connection_status.eq.error,connection_status.eq.disconnected')

    for (const acc of failingAccounts || []) {
      const repName = (acc.sales_member as unknown as { name: string })?.name || 'Sales Rep'
      alerts.push({
        id: `mailbox-${acc.id}`,
        type: 'mailbox_disconnected',
        severity: acc.connection_status === 'error' ? 'critical' : 'warning',
        title: `Mailbox ${acc.connection_status === 'error' ? 'Error' : 'Disconnected'}: ${acc.email_address}`,
        description: acc.last_error_message || `Mailbox for ${repName} is not connected to Microsoft 365.`,
        timestamp: acc.last_error_at || new Date().toISOString(),
        metadata: { account_id: acc.id },
      })
    }

    // 3. Sync failures
    const { data: syncFailures } = await supabase
      .from('email_accounts')
      .select('id, email_address, last_error_message, last_error_at')
      .eq('sync_status', 'failed')

    for (const sf of syncFailures || []) {
      alerts.push({
        id: `sync-${sf.id}`,
        type: 'sync_failure',
        severity: 'critical',
        title: `Sync Failed for ${sf.email_address}`,
        description: sf.last_error_message || 'Mailbox sync encountered an error with Microsoft Graph.',
        timestamp: sf.last_error_at || new Date().toISOString(),
        metadata: { account_id: sf.id },
      })
    }

    return NextResponse.json({ alerts })
  } catch (err) {
    return toErrorResponse(err)
  }
}
