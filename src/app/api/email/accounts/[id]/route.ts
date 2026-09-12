import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCeo()
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('email_accounts')
      .select('*, sales_member:fortline_sales_members(*)')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 })
    }

    return NextResponse.json({ account: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireCeo()
    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.display_name !== undefined) updates.display_name = body.display_name
    if (body.historical_sync_days !== undefined) updates.historical_sync_days = body.historical_sync_days
    if (body.connection_status !== undefined) updates.connection_status = body.connection_status

    const { data, error } = await supabase
      .from('email_accounts')
      .update(updates)
      .eq('id', id)
      .select('*, sales_member:fortline_sales_members(*)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('email_audit_log').insert({
      actor_email: ctx.userEmail || 'ceo@fortline.net',
      action: 'update_email_account',
      email_account_id: id,
      mailbox_email: data.email_address,
      details: updates,
      result: 'success',
    })

    return NextResponse.json({ account: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireCeo()
    const { id } = await params
    const supabase = createAdminClient()

    const { data: account } = await supabase
      .from('email_accounts')
      .select('email_address')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (account) {
      await supabase.from('email_audit_log').insert({
        actor_email: ctx.userEmail || 'ceo@fortline.net',
        action: 'delete_email_account',
        email_account_id: id,
        mailbox_email: account.email_address,
        result: 'success',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return toErrorResponse(err)
  }
}
