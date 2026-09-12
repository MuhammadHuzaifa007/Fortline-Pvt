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

    // 1. Fetch thread
    const { data: thread, error: threadErr } = await supabase
      .from('email_threads')
      .select(
        '*, email_account:email_accounts(id, email_address, display_name), sales_member:fortline_sales_members(id, name, division, designation)',
      )
      .eq('id', id)
      .single()

    if (threadErr || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // 2. Fetch all messages for this thread with attachments
    const { data: messages, error: msgErr } = await supabase
      .from('email_messages')
      .select('*, attachments:email_attachments(*)')
      .eq('thread_id', id)
      .order('sent_at', { ascending: true })

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 })
    }

    return NextResponse.json({
      thread: {
        ...thread,
        messages: messages || [],
      },
    })
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

    if (body.status !== undefined) updates.status = body.status
    if (body.priority !== undefined) updates.priority = body.priority

    const { data, error } = await supabase
      .from('email_threads')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('email_audit_log').insert({
      actor_email: ctx.userEmail || 'ceo@fortline.net',
      action: 'update_thread',
      thread_id: id,
      details: updates,
      result: 'success',
    })

    return NextResponse.json({ thread: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}
