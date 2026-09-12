import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  try {
    await requireCeo()
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('thread_id')
    const supabase = createAdminClient()

    if (!threadId) {
      return NextResponse.json({ error: 'thread_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('email_messages')
      .select('*, attachments:email_attachments(*)')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch (err) {
    return toErrorResponse(err)
  }
}
