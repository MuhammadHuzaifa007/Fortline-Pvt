import { NextResponse } from 'next/server'
import { getGlobalAiAgentSettings } from '@/lib/ai/global-switch'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const crmSecret = process.env.N8N_CRM_WEBHOOK_SECRET
    const cronSecret = process.env.AUTOMATION_CRON_SECRET

    const suppliedCrmSecret = request.headers.get('x-itechskill-crm-secret')
    const suppliedCronSecret = request.headers.get('x-cron-secret')
    const authHeader = request.headers.get('authorization') || ''
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null

    let isAuthenticated = false

    // 1. Check server-to-server secrets if configured
    if (crmSecret && suppliedCrmSecret === crmSecret) {
      isAuthenticated = true
    } else if (cronSecret && suppliedCronSecret === cronSecret) {
      isAuthenticated = true
    } else if (
      (crmSecret && bearerToken === crmSecret) ||
      (cronSecret && bearerToken === cronSecret)
    ) {
      isAuthenticated = true
    }

    // 2. Check if the caller has a valid browser session cookie
    if (!isAuthenticated) {
      try {
        const supabase = await createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          isAuthenticated = true
        }
      } catch {
        // Not a browser session
      }
    }

    // If secrets are configured in environment and authentication failed
    if (!isAuthenticated && (crmSecret || cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getGlobalAiAgentSettings()

    return NextResponse.json({
      ok: true,
      enabled: settings.enabled,
      updated_at: settings.updated_at,
    })
  } catch (err) {
    console.error('[ai-agent/status] unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
