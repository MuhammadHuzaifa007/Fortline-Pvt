import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await requireCeo()
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('thread_id')
    const clientEmail = searchParams.get('client_email')
    const supabase = createAdminClient()

    let query = supabase.from('email_notes').select('*').order('created_at', { ascending: false })

    if (threadId) query = query.eq('thread_id', threadId)
    if (clientEmail) query = query.eq('client_email', clientEmail)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notes: data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  try {
    await requireCeo()
    const body = await request.json()
    const supabase = createAdminClient()

    if (!body.note_text) {
      return NextResponse.json({ error: 'note_text is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('email_notes')
      .insert({
        thread_id: body.thread_id || null,
        client_email: body.client_email || null,
        sales_rep_id: body.sales_rep_id || null,
        note_text: body.note_text.trim(),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note: data }, { status: 201 })
  } catch (err) {
    return toErrorResponse(err)
  }
}
