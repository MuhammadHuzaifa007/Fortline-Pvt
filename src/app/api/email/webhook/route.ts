import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncEmailAccount } from '@/lib/email/sync-engine'

/**
 * Microsoft Graph Webhook Endpoint
 * Receives change notifications for monitored mailboxes.
 * Must validate subscription tokens and respond within 3 seconds.
 */

// Microsoft Graph validation handshake (GET or POST with ?validationToken=)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const validationToken = searchParams.get('validationToken')

  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ status: 'Microsoft Graph Webhook Active' })
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const validationToken = searchParams.get('validationToken')

  // Graph sometimes validates via POST with ?validationToken=
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  try {
    const body = await request.json()
    const notifications = body.value || []

    // Background processing of notifications
    if (Array.isArray(notifications) && notifications.length > 0) {
      const supabase = createAdminClient()

      for (const notification of notifications) {
        const subscriptionId = notification.subscriptionId
        const clientState = notification.clientState // email_account_id

        let accountId = clientState
        if (!accountId && subscriptionId) {
          const { data: sub } = await supabase
            .from('email_subscriptions')
            .select('email_account_id')
            .eq('subscription_id', subscriptionId)
            .single()

          accountId = sub?.email_account_id
        }

        if (accountId) {
          // Trigger sync in the background without blocking the 3-second webhook response
          syncEmailAccount(accountId).catch((syncErr) => {
            console.error(`[Webhook Sync] Error syncing account ${accountId}:`, syncErr)
          })
        }
      }
    }

    // Always respond 202 Accepted to Microsoft Graph within 3 seconds
    return new NextResponse(null, { status: 202 })
  } catch (err) {
    console.error('[Webhook Error] Processing failed:', err)
    return new NextResponse(null, { status: 202 })
  }
}
