import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmailDashboardSummary } from '@/types/email'

export async function GET() {
  try {
    await requireCeo()
    const supabase = createAdminClient()

    // 1. Sales members count
    const { count: totalSalesMembers } = await supabase
      .from('fortline_sales_members')
      .select('id', { count: 'exact', head: true })

    // 2. Email accounts counts
    const { count: connectedMailboxes } = await supabase
      .from('email_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('connection_status', 'connected')

    const { count: syncErrorsCount } = await supabase
      .from('email_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('sync_status', 'failed')

    // 3. Subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('email_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')

    // 4. Thread metrics
    const { count: totalThreads } = await supabase
      .from('email_threads')
      .select('id', { count: 'exact', head: true })

    const { count: openThreads } = await supabase
      .from('email_threads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')

    const { count: unreadThreads } = await supabase
      .from('email_threads')
      .select('id', { count: 'exact', head: true })
      .gt('unread_count', 0)

    const { count: overdueThreads } = await supabase
      .from('email_threads')
      .select('id', { count: 'exact', head: true })
      .eq('is_overdue', true)

    const { count: waitingForEmployee } = await supabase
      .from('email_threads')
      .select('id', { count: 'exact', head: true })
      .eq('waiting_for', 'employee')

    const { count: waitingForClient } = await supabase
      .from('email_threads')
      .select('id', { count: 'exact', head: true })
      .eq('waiting_for', 'client')

    // 5. Calculate average response time across threads
    const { data: responseTimes } = await supabase
      .from('email_threads')
      .select('avg_response_seconds')
      .not('avg_response_seconds', 'is', null)

    let avgResponseTimeMinutes = 0
    if (responseTimes && responseTimes.length > 0) {
      const totalSec = (responseTimes as Array<{ avg_response_seconds: number | null }>).reduce(
        (acc: number, curr: { avg_response_seconds: number | null }) =>
          acc + (curr.avg_response_seconds || 0),
        0,
      )
      avgResponseTimeMinutes = Math.round(totalSec / responseTimes.length / 60)
    }

    // 6. Emails sent and received today
    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const todayIso = startOfToday.toISOString()

    const { count: emailsSentToday } = await supabase
      .from('email_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .gte('sent_at', todayIso)

    const { count: emailsReceivedToday } = await supabase
      .from('email_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .gte('received_at', todayIso)

    const summary: EmailDashboardSummary = {
      totalSalesMembers: totalSalesMembers || 0,
      connectedMailboxes: connectedMailboxes || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalThreads: totalThreads || 0,
      openThreads: openThreads || 0,
      unreadThreads: unreadThreads || 0,
      overdueThreads: overdueThreads || 0,
      waitingForEmployee: waitingForEmployee || 0,
      waitingForClient: waitingForClient || 0,
      avgResponseTimeMinutes,
      emailsSentToday: emailsSentToday || 0,
      emailsReceivedToday: emailsReceivedToday || 0,
      syncErrorsCount: syncErrorsCount || 0,
    }

    return NextResponse.json({ summary })
  } catch (err) {
    return toErrorResponse(err)
  }
}
