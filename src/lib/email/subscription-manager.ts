import { createAdminClient } from '@/lib/supabase/admin'
import { createSubscription, renewSubscription } from './microsoft-graph'

/**
 * Microsoft Graph Webhook Subscription Manager
 * Handles automatic creation, tracking, and renewal of change notification subscriptions.
 * Microsoft Graph limits Mail subscriptions to max 4230 minutes (~2.9 days).
 */

export async function manageMailboxSubscriptions(webhookUrl: string): Promise<{
  created: number
  renewed: number
  errors: Array<{ email: string; error: string }>
}> {
  const supabase = createAdminClient()
  let created = 0
  let renewed = 0
  const errors: Array<{ email: string; error: string }> = []

  // 1. Fetch all connected/authorized accounts
  const { data: accounts, error: accError } = await supabase
    .from('email_accounts')
    .select('id, email_address')
    .in('connection_status', ['connected', 'syncing'])

  if (accError || !accounts) {
    throw new Error(`Failed to load email accounts: ${accError?.message}`)
  }

  const now = new Date()
  const renewThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000) // renew if expires within 24h

  for (const account of accounts) {
    try {
      // Check existing subscription
      const { data: sub } = await supabase
        .from('email_subscriptions')
        .select('*')
        .eq('email_account_id', account.id)
        .eq('status', 'active')
        .single()

      if (sub) {
        const expirationDate = new Date(sub.expiration_at)
        if (expirationDate <= renewThreshold) {
          // Renew existing subscription
          try {
            const renewedSub = await renewSubscription(sub.subscription_id)
            await supabase
              .from('email_subscriptions')
              .update({
                expiration_at: renewedSub.expirationDateTime,
                last_renewal_at: new Date().toISOString(),
                last_renewal_error: null,
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', sub.id)

            renewed++
          } catch (renewErr: unknown) {
            console.warn(`[Subscription Manager] Failed to renew sub for ${account.email_address}, recreating:`, renewErr)
            // Re-create if renewal fails
            const newSub = await createSubscription(
              account.email_address,
              webhookUrl,
              account.id, // clientState
            )

            await supabase
              .from('email_subscriptions')
              .update({
                subscription_id: newSub.id,
                expiration_at: newSub.expirationDateTime,
                last_renewal_at: new Date().toISOString(),
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', sub.id)

            created++
          }
        }
      } else {
        // Create brand new subscription
        const newSub = await createSubscription(
          account.email_address,
          webhookUrl,
          account.id, // clientState
        )

        await supabase.from('email_subscriptions').insert({
          email_account_id: account.id,
          subscription_id: newSub.id,
          resource: `/users/${account.email_address}/mailFolders('Inbox')/messages`,
          expiration_at: newSub.expirationDateTime,
          status: 'active',
          last_renewal_at: new Date().toISOString(),
        })

        created++
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Subscription error'
      console.error(`[Subscription Manager] Error for ${account.email_address}:`, msg)
      errors.push({ email: account.email_address, error: msg })
    }
  }

  return { created, renewed, errors }
}
