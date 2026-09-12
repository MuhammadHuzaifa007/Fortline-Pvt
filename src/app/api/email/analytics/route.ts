import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireCeo()
    const supabase = createAdminClient()

    // 1. Fetch sales members
    const { data: members, error: memErr } = await supabase
      .from('fortline_sales_members')
      .select('id, name, division, designation, email_address')
      .order('name', { ascending: true })

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 })
    }

    // 2. Fetch email accounts
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('*')

    // 3. Fetch threads
    const { data: threads } = await supabase
      .from('email_threads')
      .select('sales_rep_id, status, waiting_for, is_overdue, first_response_seconds, avg_response_seconds, last_message_at')

    // 4. Fetch messages count
    const { data: messages } = await supabase
      .from('email_messages')
      .select('sales_rep_id, direction, sent_at')

    const memberList = (members || []) as Array<{
      id: string
      name: string
      division: string
      designation: string
      email_address?: string | null
    }>

    const accountList = (accounts || []) as Array<{
      sales_rep_id: string
      email_address: string
      connection_status: string
      sync_status: string
      last_sync_at: string | null
    }>

    const threadList = (threads || []) as Array<{
      sales_rep_id: string
      status: string
      waiting_for: string
      is_overdue: boolean
      avg_response_seconds?: number | null
      last_message_at: string
    }>

    const messageList = (messages || []) as Array<{
      sales_rep_id: string
      direction: string
      sent_at: string
    }>

    // Map analytics per sales rep
    const analytics = memberList.map((m) => {
      const account = accountList.find((a) => a.sales_rep_id === m.id)
      const repThreads = threadList.filter((t) => t.sales_rep_id === m.id)
      const repMessages = messageList.filter((msg) => msg.sales_rep_id === m.id)

      const totalThreads = repThreads.length
      const openThreads = repThreads.filter((t) => t.status === 'open').length
      const overdueThreads = repThreads.filter((t) => t.is_overdue).length
      const waitingForRep = repThreads.filter((t) => t.waiting_for === 'employee').length

      const responseTimes = repThreads
        .filter((t) => t.avg_response_seconds !== null && t.avg_response_seconds !== undefined)
        .map((t) => t.avg_response_seconds as number)

      const avgResponseMinutes =
        responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length / 60)
          : null

      const sentCount = repMessages.filter((msg) => msg.direction === 'outbound').length
      const receivedCount = repMessages.filter((msg) => msg.direction === 'inbound').length

      // Last activity
      let lastActivityAt: string | null = null
      if (repMessages.length > 0) {
        const sorted = [...repMessages].sort(
          (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
        )
        lastActivityAt = sorted[0].sent_at
      }

      return {
        id: m.id,
        name: m.name,
        division: m.division,
        designation: m.designation,
        email_address: account?.email_address || m.email_address,
        connection_status: account?.connection_status || 'disconnected',
        sync_status: account?.sync_status || 'idle',
        last_sync_at: account?.last_sync_at || null,
        totalThreads,
        openThreads,
        overdueThreads,
        waitingForRep,
        avgResponseMinutes,
        sentCount,
        receivedCount,
        lastActivityAt,
      }
    })

    return NextResponse.json({ analytics })
  } catch (err) {
    return toErrorResponse(err)
  }
}
