import { createGraphClient, executeWithRetry } from './graph-client'
import { createAdminClient } from '@/lib/supabase/admin'
import { SendEmailPayload, EmailRecipient } from '@/types/email'

/**
 * Microsoft Graph Mail Service
 * Production-ready service wrapping Graph API calls for monitored mailboxes.
 * Enforces strict mailbox authorization against the database before any Graph call.
 */

export interface GraphMessage {
  id: string
  conversationId: string
  subject: string
  bodyPreview: string
  importance: 'low' | 'normal' | 'high'
  hasAttachments: boolean
  isRead: boolean
  isDraft: boolean
  sentDateTime: string
  receivedDateTime: string
  internetMessageId?: string
  conversationIndex?: string
  from?: {
    emailAddress: {
      name?: string
      address: string
    }
  }
  sender?: {
    emailAddress: {
      name?: string
      address: string
    }
  }
  toRecipients?: Array<{
    emailAddress: {
      name?: string
      address: string
    }
  }>
  ccRecipients?: Array<{
    emailAddress: {
      name?: string
      address: string
    }
  }>
  bccRecipients?: Array<{
    emailAddress: {
      name?: string
      address: string
    }
  }>
  body?: {
    contentType: 'text' | 'html'
    content: string
  }
  parentFolderId?: string
}

export interface GraphAttachment {
  id: string
  name: string
  contentType: string
  size: number
  isInline: boolean
  contentId?: string
  contentBytes?: string // base64
}

/**
 * Verifies that the requested email address belongs to an authorized email account in Fortline CRM.
 * Prevents unauthorized or cross-mailbox operations (AGENTS.md invariant §15, §17, §18).
 */
export async function assertAuthorizedMailbox(emailAddress: string) {
  const normalizedEmail = emailAddress.trim().toLowerCase()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('email_accounts')
    .select('id, email_address, sales_rep_id, authorization_status, connection_status')
    .ilike('email_address', normalizedEmail)
    .single()

  if (error || !data) {
    throw new Error(`Unauthorized mailbox: '${emailAddress}' is not an authorized Fortline monitored account.`)
  }

  return data
}

/**
 * Validates that a mailbox exists and can be reached via Microsoft Graph
 */
export async function getMailboxProfile(emailAddress: string) {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  return await executeWithRetry(async () => {
    return await client.api(`/users/${encodeURIComponent(emailAddress)}`).get()
  })
}

/**
 * Lists messages from a monitored mailbox with optional pagination and delta support
 */
export async function listMessages(
  emailAddress: string,
  options: {
    top?: number
    skip?: number
    deltaLink?: string
    since?: Date
    folder?: string
  } = {},
): Promise<{ messages: GraphMessage[]; nextLink?: string; deltaLink?: string }> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  return await executeWithRetry(async () => {
    let req = options.deltaLink
      ? client.api(options.deltaLink)
      : client
          .api(`/users/${encodeURIComponent(emailAddress)}/mailFolders/${options.folder || 'inbox'}/messages`)
          .top(options.top || 50)
          .select(
            'id,conversationId,subject,bodyPreview,importance,hasAttachments,isRead,isDraft,sentDateTime,receivedDateTime,internetMessageId,from,sender,toRecipients,ccRecipients,bccRecipients,body,parentFolderId',
          )
          .orderby('receivedDateTime DESC')

    if (!options.deltaLink && options.since) {
      req = req.filter(`receivedDateTime ge ${options.since.toISOString()}`)
    }

    const response = await req.get()
    return {
      messages: response.value || [],
      nextLink: response['@odata.nextLink'],
      deltaLink: response['@odata.deltaLink'],
    }
  })
}

/**
 * Retrieves a single email message including its full body
 */
export async function getMessage(
  emailAddress: string,
  messageId: string,
): Promise<GraphMessage> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  return await executeWithRetry(async () => {
    return await client
      .api(`/users/${encodeURIComponent(emailAddress)}/messages/${messageId}`)
      .select(
        'id,conversationId,subject,bodyPreview,importance,hasAttachments,isRead,isDraft,sentDateTime,receivedDateTime,internetMessageId,from,sender,toRecipients,ccRecipients,bccRecipients,body,parentFolderId',
      )
      .get()
  })
}

/**
 * Sends an email from an authorized mailbox
 */
export async function sendMail(
  emailAddress: string,
  payload: SendEmailPayload,
): Promise<{ success: boolean; messageId?: string }> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  const toRecipients = payload.to.map((r) => ({
    emailAddress: { name: r.name || undefined, address: r.email },
  }))

  const ccRecipients = (payload.cc || []).map((r) => ({
    emailAddress: { name: r.name || undefined, address: r.email },
  }))

  const bccRecipients = (payload.bcc || []).map((r) => ({
    emailAddress: { name: r.name || undefined, address: r.email },
  }))

  const attachments = (payload.attachments || []).map((att) => ({
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: att.filename,
    contentType: att.mime_type,
    contentBytes: att.content_bytes_base64,
    isInline: att.is_inline || false,
    contentId: att.content_id || undefined,
  }))

  const message = {
    subject: payload.subject,
    body: {
      contentType: 'HTML',
      content: payload.body_html || payload.body_text || '',
    },
    toRecipients,
    ccRecipients,
    bccRecipients,
    attachments: attachments.length > 0 ? attachments : undefined,
  }

  return await executeWithRetry(async () => {
    // Send email using /users/{email}/sendMail with saveToSentItems=true
    await client
      .api(`/users/${encodeURIComponent(emailAddress)}/sendMail`)
      .post({ message, saveToSentItems: true })

    return { success: true }
  })
}

/**
 * Replies or Reply-All to an existing message from an authorized mailbox
 */
export async function replyToMessage(
  emailAddress: string,
  messageId: string,
  comment: string,
  replyAll = false,
): Promise<{ success: boolean }> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()
  const endpoint = replyAll ? 'replyAll' : 'reply'

  return await executeWithRetry(async () => {
    await client
      .api(`/users/${encodeURIComponent(emailAddress)}/messages/${messageId}/${endpoint}`)
      .post({ comment })

    return { success: true }
  })
}

/**
 * Forwards an existing message from an authorized mailbox
 */
export async function forwardMessage(
  emailAddress: string,
  messageId: string,
  toRecipients: EmailRecipient[],
  comment?: string,
): Promise<{ success: boolean }> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  const formattedRecipients = toRecipients.map((r) => ({
    emailAddress: { name: r.name || undefined, address: r.email },
  }))

  return await executeWithRetry(async () => {
    await client
      .api(`/users/${encodeURIComponent(emailAddress)}/messages/${messageId}/forward`)
      .post({
        toRecipients: formattedRecipients,
        comment: comment || '',
      })

    return { success: true }
  })
}

/**
 * Updates the read state of a message
 */
export async function updateReadState(
  emailAddress: string,
  messageId: string,
  isRead: boolean,
): Promise<void> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  await executeWithRetry(async () => {
    await client
      .api(`/users/${encodeURIComponent(emailAddress)}/messages/${messageId}`)
      .patch({ isRead })
  })
}

/**
 * Retrieves an attachment's details & base64 content
 */
export async function getAttachment(
  emailAddress: string,
  messageId: string,
  attachmentId: string,
): Promise<GraphAttachment> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  return await executeWithRetry(async () => {
    return await client
      .api(`/users/${encodeURIComponent(emailAddress)}/messages/${messageId}/attachments/${attachmentId}`)
      .get()
  })
}

/**
 * Creates a Graph change notification webhook subscription
 * Note: Microsoft Graph requires HTTPS webhook URL and subscriptions expire after max ~3 days (4230 min).
 */
export async function createSubscription(
  emailAddress: string,
  notificationUrl: string,
  clientState: string,
): Promise<{ id: string; expirationDateTime: string }> {
  await assertAuthorizedMailbox(emailAddress)
  const client = createGraphClient()

  // Microsoft Graph limits Mail subscriptions to max 4230 minutes (~2.9 days)
  const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1000).toISOString()

  return await executeWithRetry(async () => {
    return await client.api('/subscriptions').post({
      changeType: 'created,updated',
      notificationUrl,
      resource: `/users/${encodeURIComponent(emailAddress)}/mailFolders('Inbox')/messages`,
      expirationDateTime,
      clientState,
    })
  })
}

/**
 * Renews an existing Microsoft Graph webhook subscription
 */
export async function renewSubscription(
  subscriptionId: string,
): Promise<{ id: string; expirationDateTime: string }> {
  const client = createGraphClient()
  const expirationDateTime = new Date(Date.now() + 4200 * 60 * 1000).toISOString()

  return await executeWithRetry(async () => {
    return await client.api(`/subscriptions/${subscriptionId}`).patch({
      expirationDateTime,
    })
  })
}

/**
 * Deletes a Microsoft Graph webhook subscription
 */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const client = createGraphClient()

  await executeWithRetry(async () => {
    await client.api(`/subscriptions/${subscriptionId}`).delete()
  })
}
