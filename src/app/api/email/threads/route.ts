import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await requireCeo()
    const { searchParams } = new URL(request.url)
    const supabase = createAdminClient()

    const salesRepId = searchParams.get('sales_rep_id')
    const accountId = searchParams.get('account_id')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const waitingFor = searchParams.get('waiting_for')
    const isOverdue = searchParams.get('is_overdue')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabase
      .from('email_threads')
      .select(
        '*, email_account:email_accounts(id, email_address, display_name), sales_member:fortline_sales_members(id, name, division, designation)',
        { count: 'exact' },
      )

    if (salesRepId) query = query.eq('sales_rep_id', salesRepId)
    if (accountId) query = query.eq('email_account_id', accountId)
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (waitingFor) query = query.eq('waiting_for', waitingFor)
    if (isOverdue === 'true') query = query.eq('is_overdue', true)
    if (isOverdue === 'false') query = query.eq('is_overdue', false)

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,client_email.ilike.%${search}%,client_name.ilike.%${search}%`,
      )
    }

    query = query
      .order('last_message_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      threads: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
