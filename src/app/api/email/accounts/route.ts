import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireCeo()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('email_accounts')
      .select('*, sales_member:fortline_sales_members(id, name, division, designation, phone_number)')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ accounts: data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireCeo()
    const body = await request.json()

    if (!body.sales_rep_id || !body.email_address) {
      return NextResponse.json(
        { error: 'sales_rep_id and email_address are required' },
        { status: 400 },
      )
    }

    const emailAddress = body.email_address.trim().toLowerCase()
    const supabase = createAdminClient()

    // 1. Verify sales rep exists
    const { data: rep, error: repError } = await supabase
      .from('fortline_sales_members')
      .select('id, name')
      .eq('id', body.sales_rep_id)
      .single()

    if (repError || !rep) {
      return NextResponse.json({ error: 'Sales member not found' }, { status: 404 })
    }

    // 2. Insert or update email account
    const { data: account, error: accError } = await supabase
      .from('email_accounts')
      .upsert(
        {
          sales_rep_id: body.sales_rep_id,
          email_address: emailAddress,
          display_name: body.display_name || rep.name,
          provider: 'microsoft365',
          connection_status: 'disconnected',
          authorization_status: 'unauthorized',
          sync_status: 'idle',
          historical_sync_days: body.historical_sync_days || 30,
        },
        { onConflict: 'email_address' },
      )
      .select('*, sales_member:fortline_sales_members(id, name, division, designation)')
      .single()

    if (accError) {
      return NextResponse.json({ error: accError.message }, { status: 500 })
    }

    // Also update sales member's email_address column
    await supabase
      .from('fortline_sales_members')
      .update({ email_address: emailAddress })
      .eq('id', body.sales_rep_id)

    // Audit log
    await supabase.from('email_audit_log').insert({
      actor_email: ctx.userEmail || 'ceo@fortline.net',
      action: 'connect_email_account',
      email_account_id: account.id,
      mailbox_email: emailAddress,
      details: { sales_rep_id: body.sales_rep_id, display_name: body.display_name },
      result: 'success',
    })

    return NextResponse.json({ account }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
