import { NextResponse } from 'next/server'
import { getCurrentAccount, toErrorResponse } from '@/lib/auth/account'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  getGlobalAiAgentSettings,
  updateGlobalAiAgentSettings,
} from '@/lib/ai/global-switch'

const TOGGLE_RATE_LIMIT = {
  limit: 3,
  windowMs: 1000,
}

export async function GET() {
  try {
    await getCurrentAccount()
    const settings = await getGlobalAiAgentSettings()
    return NextResponse.json({
      ok: true,
      enabled: settings.enabled,
      updated_at: settings.updated_at,
      updated_by_email: settings.updated_by_email,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getCurrentAccount()

    const rl = checkRateLimit(`ai-agent-toggle:${ctx.userId}`, TOGGLE_RATE_LIMIT)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid body: 'enabled' must be a boolean" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updated = await updateGlobalAiAgentSettings(body.enabled, {
      id: ctx.userId,
      email: user?.email || null,
    })

    return NextResponse.json({
      ok: true,
      enabled: updated.enabled,
      updated_at: updated.updated_at,
      updated_by_email: updated.updated_by_email,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
