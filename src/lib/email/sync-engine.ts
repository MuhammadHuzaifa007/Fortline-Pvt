import { createAdminClient } from '@/lib/supabase/admin'
import { listMessages, getMailboxProfile, GraphMessage } from './microsoft-graph'
import { calculateThreadMetrics, isAutomatedEmail } from './response-metrics'
import { EmailDirection } from '@/types/email'

/**
 * Synchronization Engine for Microsoft 365 / Outlook Mailboxes.
 * Handles initial historical sync, incremental delta syncs, and webhook change processing.
 */

export async function syncEmailAccount(emailAccountId: string): Promise<{
  success: boolean
  messagesSynced: number
  error?: string
}> {
  const supabase = createAdminClient()

  // 1. Fetch email account record
  const { data: account, error: accountError } = await supabase
    .from('email_accounts')
    .select('*, sales_member:fortline_sales_members(*)')
    .eq('id', emailAccountId)
    .single()

  if (accountError || !account) {
    throw new Error(`Email account not found for id: ${emailAccountId}`)
  }

  const emailAddress = account.email_address
  const salesRepId = account.sales_rep_id

  // 2. Mark account as syncing
  await supabase
    .from('email_accounts')
    .update({
      sync_status: 'syncing',
      last_sync_at: new Date().toISOString(),
      last_error_message: null,
    })
    .eq('id', emailAccountId)

  try {
    // 3. Test mailbox connection first
    const profile = await getMailboxProfile(emailAddress)
    const microsoftUserId = profile?.id || null

    // 4. Determine sync strategy: delta sync if cursor exists, else date-window initial sync
    const historicalDays = account.historical_sync_days || 30
    const sinceDate = new Date(Date.now() - historicalDays * 24 * 60 * 60 * 1000)

    const listOptions: {
      deltaLink?: string
      since?: Date
      top: number
    } = {
      top: 50,
    }

    if (account.sync_cursor) {
      listOptions.deltaLink = account.sync_cursor
    } else {
      listOptions.since = sinceDate
    }

    const { messages, deltaLink } = await listMessages(emailAddress, listOptions)

    let syncedCount = 0

    // 5. Process messages
    for (const msg of messages) {
      await processGraphMessage(supabase, account, msg, salesRepId)
      syncedCount++
    }

    // 6. Update account status to healthy
    await supabase
      .from('email_accounts')
      .update({
        connection_status: 'connected',
        authorization_status: 'authorized',
        sync_status: 'success',
        microsoft_user_id: microsoftUserId,
        last_successful_sync_at: new Date().toISOString(),
        sync_cursor: deltaLink || account.sync_cursor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId)

    return {
      success: true,
      messagesSynced: syncedCount,
    }
  } catch (err: unknown) {
    const errorMessage = (err as Error).message || 'Unknown sync error'
    console.error(`[Email Sync] Error syncing mailbox ${emailAddress}:`, errorMessage)

    await supabase
      .from('email_accounts')
      .update({
        connection_status: 'error',
        sync_status: 'failed',
        last_error_at: new Date().toISOString(),
        last_error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emailAccountId)

    return {
      success: false,
      messagesSynced: 0,
      error: errorMessage,
    }
  }
}

/**
 * Normalizes and stores a Graph message and updates its corresponding thread
 */
export async function processGraphMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  account: any,
  msg: GraphMessage,
  salesRepId: string,
) {
  const emailAccountId = account.id
  const repEmail = account.email_address.toLowerCase()
  const providerMessageId = msg.id
  const providerThreadId = msg.conversationId || msg.id

  // Check if message already exists
  const { data: existingMsg } = await supabase
    .from('email_messages')
    .select('id')
    .eq('provider_message_id', providerMessageId)
    .single()

  if (existingMsg) {
    return existingMsg
  }

  // Determine direction
  const senderEmail = (msg.from?.emailAddress?.address || msg.sender?.emailAddress?.address || '').toLowerCase()
  const senderName = msg.from?.emailAddress?.name || msg.sender?.emailAddress?.name || null
  const direction: EmailDirection = senderEmail === repEmail ? 'outbound' : 'inbound'

  // Determine client details
  let clientEmail = ''
  let clientName: string | null = null

  if (direction === 'inbound') {
    clientEmail = senderEmail
    clientName = senderName
  } else {
    // For outbound, the first recipient is the primary client
    const firstRecipient = msg.toRecipients?.[0]?.emailAddress
    clientEmail = (firstRecipient?.address || '').toLowerCase()
    clientName = firstRecipient?.name || null
  }

  // Format recipients
  const recipients = (msg.toRecipients || []).map((r) => ({
    name: r.emailAddress?.name || null,
    email: (r.emailAddress?.address || '').toLowerCase(),
  }))

  const cc = (msg.ccRecipients || []).map((r) => ({
    name: r.emailAddress?.name || null,
    email: (r.emailAddress?.address || '').toLowerCase(),
  }))

  const bcc = (msg.bccRecipients || []).map((r) => ({
    name: r.emailAddress?.name || null,
    email: (r.emailAddress?.address || '').toLowerCase(),
  }))

  // Automated check
  const isAutomated = isAutomatedEmail({
    subject: msg.subject,
    sender_email: senderEmail,
  })

  // 1. Find or create Thread
  const { data: threadData } = await supabase
    .from('email_threads')
    .select('*')
    .eq('email_account_id', emailAccountId)
    .eq('provider_thread_id', providerThreadId)
    .single()

  let threadId = threadData?.id

  const sentAt = msg.sentDateTime || msg.receivedDateTime || new Date().toISOString()
  const receivedAt = msg.receivedDateTime || msg.sentDateTime || new Date().toISOString()

  if (!threadData) {
    const { data: newThread, error: threadErr } = await supabase
      .from('email_threads')
      .insert({
        email_account_id: emailAccountId,
        sales_rep_id: salesRepId,
        provider_thread_id: providerThreadId,
        subject: msg.subject || '(No Subject)',
        last_message_at: receivedAt,
        message_count: 1,
        unread_count: msg.isRead ? 0 : 1,
        status: 'open',
        priority: msg.importance === 'high' ? 'high' : 'normal',
        client_email: clientEmail || 'unknown@client.com',
        client_name: clientName,
        last_sender_type: direction === 'inbound' ? 'client' : 'employee',
        has_attachments: msg.hasAttachments || false,
      })
      .select('id')
      .single()

    if (threadErr) {
      console.error('[Email Sync] Failed to create thread:', threadErr)
      throw threadErr
    }
    threadId = newThread.id
  } else {
    // Update thread last message time and counts
    await supabase
      .from('email_threads')
      .update({
        last_message_at: receivedAt,
        message_count: (threadData.message_count || 0) + 1,
        unread_count: (threadData.unread_count || 0) + (msg.isRead ? 0 : 1),
        last_sender_type: direction === 'inbound' ? 'client' : 'employee',
        has_attachments: threadData.has_attachments || msg.hasAttachments || false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId)
  }

  // 2. Insert Message
  const bodyText = msg.body?.contentType === 'text' ? msg.body.content : null
  const bodyHtml = msg.body?.contentType === 'html' ? msg.body.content : null

  const { data: insertedMsg, error: msgErr } = await supabase
    .from('email_messages')
    .insert({
      thread_id: threadId,
      email_account_id: emailAccountId,
      sales_rep_id: salesRepId,
      provider_message_id: providerMessageId,
      provider_thread_id: providerThreadId,
      direction,
      sender_email: senderEmail,
      sender_name: senderName,
      recipients,
      cc,
      bcc,
      subject: msg.subject || '',
      body_text: bodyText,
      body_html: bodyHtml,
      snippet: msg.bodyPreview || '',
      sent_at: sentAt,
      received_at: receivedAt,
      is_read: msg.isRead || false,
      has_attachments: msg.hasAttachments || false,
      is_draft: msg.isDraft || false,
      is_automated: isAutomated,
      internet_message_id: msg.internetMessageId || null,
      provider_folder: msg.parentFolderId || 'Inbox',
    })
    .select('id')
    .single()

  if (msgErr) {
    console.error('[Email Sync] Failed to insert message:', msgErr)
    throw msgErr
  }

  // 3. Recalculate Thread Response Metrics
  const { data: allThreadMessages } = await supabase
    .from('email_messages')
    .select('direction, sent_at, is_automated')
    .eq('thread_id', threadId)
    .order('sent_at', { ascending: true })

  if (allThreadMessages && allThreadMessages.length > 0) {
    const metrics = calculateThreadMetrics(allThreadMessages, threadData?.priority || 'normal')

    await supabase
      .from('email_threads')
      .update({
        first_response_at: metrics.firstResponseAt,
        first_response_seconds: metrics.firstResponseSeconds,
        avg_response_seconds: metrics.avgResponseSeconds,
        waiting_for: metrics.waitingFor,
        is_overdue: metrics.isOverdue,
        last_sender_type: metrics.lastSenderType,
      })
      .eq('id', threadId)
  }

  return insertedMsg
}
