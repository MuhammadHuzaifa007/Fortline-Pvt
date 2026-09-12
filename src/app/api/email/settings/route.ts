import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    await requireCeo()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireCeo()
    const body = await request.json()
    const supabase = createAdminClient()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.timezone !== undefined) updates.timezone = body.timezone
    if (body.normal_sla_hours !== undefined) updates.normal_sla_hours = body.normal_sla_hours
    if (body.high_priority_sla_hours !== undefined) updates.high_priority_sla_hours = body.high_priority_sla_hours
    if (body.business_hours_start !== undefined) updates.business_hours_start = body.business_hours_start
    if (body.business_hours_end !== undefined) updates.business_hours_end = body.business_hours_end
    if (body.working_days !== undefined) updates.working_days = body.working_days
    if (body.historical_sync_days !== undefined) updates.historical_sync_days = body.historical_sync_days

    const { data, error } = await supabase
      .from('email_settings')
      .update(updates)
      .eq('id', 1)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('email_audit_log').insert({
      actor_email: ctx.userEmail || 'ceo@fortline.net',
      action: 'update_email_settings',
      details: updates,
      result: 'success',
    })

    return NextResponse.json({ settings: data })
  } catch (err) {
    return toErrorResponse(err)
  }
}
