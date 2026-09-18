import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'
import {
  sendMessageToConversation,
  validateSendMessageParams,
  SendMessageError,
} from '@/lib/whatsapp/send-message'

// The dashboard's outbound-send endpoint. It owns auth, per-user rate
// limiting, and the two ways the UI targets a thread — an existing
// `conversation_id` (inbox) or a `contact_id` (Contact detail →
// find-or-create the conversation). The actual Meta plumbing (validate
// → send → persist → pause flows) lives in the shared
// `sendMessageToConversation` core, which the public `/api/v1/messages`
// endpoint reuses. This route is a thin adapter: resolve the
// conversation, delegate, then map `SendMessageError` back onto the
// dashboard's internal `{ error }` shape.
export async function POST(request: Request) {
  try {
    // Requires the 'agent' role, matching both `canSendMessages` and the
    // `messages_modify` RLS policy (migration 017).
    //
    // Resolving `account_id` off the profile — which any 'viewer' has —
    // was previously the only gate. RLS did block the message INSERT, but
    // the send core calls Meta BEFORE it persists, so a viewer's request
    // still delivered a real WhatsApp message to the customer and merely
    // failed to record it (surfacing as "sent to Meta but failed to save
    // to DB"). RLS can't un-send that, so the role check belongs here.
    const { supabase, accountId, userId } = await requireRole('agent')

    // Per-user rate limit. Bucket key is scoped to this route so
    // `/broadcast` has an independent budget.
    const limit = checkRateLimit(`send:${userId}`, RATE_LIMITS.send)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    const body = await request.json()
    const {
      // `conversation_id` targets an existing thread (inbox). `contact_id`
      // lets a caller initiate from a contact that may have no conversation
      // yet (Contact detail → Send template) — we find-or-create one below.
      conversation_id: conversationIdInput,
      contact_id,
      message_type,
      content_text,
      media_url,
      filename,
      template_name,
      template_language,
      template_params,
      template_message_params,
      interactive_payload,
      reply_to_message_id,
    } = body

    if ((!conversationIdInput && !contact_id) || !message_type) {
      return NextResponse.json(
        {
          error:
            'Either conversation_id or contact_id, plus message_type, are required',
        },
        { status: 400 }
      )
    }

    // Validate the message shape up front — before the contact_id path
    // finds-or-creates a conversation — so an invalid payload 400s
    // without leaving an orphan empty conversation behind.
    try {
      validateSendMessageParams({
        messageType: message_type,
        contentText: content_text,
        mediaUrl: media_url,
        templateName: template_name,
        interactivePayload: interactive_payload,
      })
    } catch (err) {
      if (err instanceof SendMessageError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }

    // Resolve the target conversation. With `conversation_id` we load the
    // existing thread; with `contact_id` we find-or-create one for the
    // contact so a business-initiated template send (Contact detail view)
    // reuses the shared send core below.
    let conversationId: string | null = null

    if (conversationIdInput) {
      const { data, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationIdInput)
        .eq('account_id', accountId)
        .single()

      if (convError || !data) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
      conversationId = data.id
    } else {
      // contact_id path: verify the contact is in this account first so a
      // caller can't open a conversation against someone else's contact.
      const { data: contactRow, error: contactErr } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', contact_id)
        .eq('account_id', accountId)
        .maybeSingle()

      if (contactErr || !contactRow) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        )
      }

      const resolved = await findOrCreateConversation(
        supabase,
        accountId,
        userId,
        contact_id
      )
      if (!resolved) {
        return NextResponse.json(
          { error: 'Failed to open a conversation for this contact' },
          { status: 500 }
        )
      }
      conversationId = resolved
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // ----------------------------------------------------------------
    // Channel-type routing: check if this conversation belongs to a
    // QR-gateway / Evolution channel. If so, route through Evolution
    // API instead of Meta Cloud API. This keeps the frontend simple —
    // all sends go through /api/whatsapp/send regardless of channel.
    // ----------------------------------------------------------------
    const { data: convRow } = await supabase
      .from('conversations')
      .select('whatsapp_channel_id')
      .eq('id', conversationId)
      .eq('account_id', accountId)
      .single()

    if (convRow?.whatsapp_channel_id) {
      const adminClient = (await import('@/lib/supabase/admin')).supabaseAdmin()
      const { data: channel } = await adminClient
        .from('fortline_channels')
        .select('id, gateway_instance_id, channel_type, connection_status')
        .eq('id', convRow.whatsapp_channel_id)
        .maybeSingle()

      if (channel?.channel_type === 'qr_gateway') {
        // Only text sends are supported via Evolution for now
        if (message_type !== 'text') {
          return NextResponse.json(
            {
              error: `${message_type} messages are not yet supported on QR gateway channels. Only text messages can be sent.`,
            },
            { status: 400 }
          )
        }

        if (!content_text?.trim()) {
          return NextResponse.json(
            { error: 'Message text cannot be empty' },
            { status: 400 }
          )
        }

        if (!channel.gateway_instance_id) {
          return NextResponse.json(
            {
              error:
                'No Evolution instance configured for this channel. Reconnect the sales line in Settings.',
            },
            { status: 400 }
          )
        }

        if (channel.connection_status === 'disconnected') {
          return NextResponse.json(
            {
              error:
                'This WhatsApp line is disconnected. Reconnect it in Settings before sending.',
            },
            { status: 400 }
          )
        }

        // Resolve the Evolution recipient.
        //
        // Prefer a real phone number whenever we have one. For historical
        // Baileys chats that only have a WhatsApp LID (`...@lid`), fall back
        // to the stored whatsapp_jid / metadata remoteJid so the CEO can still
        // reply to that exact Evolution thread.
        const { data: convWithContact } = await adminClient
          .from('conversations')
          .select('contact:contacts(phone, whatsapp_jid, metadata)')
          .eq('id', conversationId)
          .single()

        const contact = (convWithContact?.contact as any) || null

        const contactPhone =
          typeof contact?.phone === 'string'
            ? contact.phone.replace(/\D/g, '')
            : ''

        const storedWhatsappJid =
          typeof contact?.whatsapp_jid === 'string'
            ? contact.whatsapp_jid.trim()
            : ''

        const metadataRemoteJid =
          typeof contact?.metadata?.remoteJid === 'string'
            ? contact.metadata.remoteJid.trim()
            : ''

        const lidRecipient =
          storedWhatsappJid.endsWith('@lid')
            ? storedWhatsappJid
            : metadataRemoteJid.endsWith('@lid')
              ? metadataRemoteJid
              : ''

        // Normal phone routing remains the first choice. LID is only used
        // when the historical chat has no resolvable phone number.
        const evolutionRecipient = contactPhone || lidRecipient

        if (!evolutionRecipient) {
          return NextResponse.json(
            {
              error:
                'This WhatsApp contact has no resolvable phone number or Evolution LID yet. Sync the chat again and retry.',
            },
            { status: 400 }
          )
        }

        // Send via Evolution — do NOT persist; the webhook handles that
        const { sendEvolutionText } = await import(
          '@/lib/evolution/evolution-api'
        )
        const evoResult = await sendEvolutionText(
          channel.gateway_instance_id,
          evolutionRecipient,
          content_text.trim()
        )

        if (!evoResult.success) {
          return NextResponse.json(
            { error: evoResult.error || 'Failed to send via Evolution' },
            { status: 502 }
          )
        }

        return NextResponse.json({
          success: true,
          // No message_id or whatsapp_message_id — the webhook will
          // persist the outbound message when Evolution echoes it.
          channel_type: 'qr_gateway',
        })
      }
    }

    // ----------------------------------------------------------------
    // Default path: Meta Cloud API (cloud_api channels or no channel)
    // ----------------------------------------------------------------

    // Delegate to the shared send core (validates, sends to Meta with
    // phone-variant retry, persists, pauses active flow runs). Its
    // `SendMessageError` carries a machine code + HTTP status; the
    // dashboard maps it to the internal `{ error }` shape.
    try {
      const result = await sendMessageToConversation(supabase, accountId, {
        conversationId,
        messageType: message_type,
        contentText: content_text,
        mediaUrl: media_url,
        filename,
        templateName: template_name,
        templateLanguage: template_language,
        templateParams: template_params,
        templateMessageParams: template_message_params,
        interactivePayload: interactive_payload,
        replyToMessageId: reply_to_message_id,
      })

      return NextResponse.json({
        success: true,
        message_id: result.messageId,
        whatsapp_message_id: result.whatsappMessageId,
      })
    } catch (err) {
      if (err instanceof SendMessageError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        )
      }
      throw err
    }
  } catch (error) {
    // requireRole throws Unauthorized/Forbidden; toErrorResponse maps
    // those to 401/403 and collapses anything else to a generic 500.
    console.error('Error in WhatsApp send POST:', error)
    return toErrorResponse(error)
  }
}

type SendSupabase = Awaited<ReturnType<typeof createClient>>

/**
 * Return the contact's conversation id in this account, creating one if
 * it doesn't exist yet. Mirrors the webhook's find-or-create so an
 * inbound-then-outbound (or outbound-first) sequence converges on a single
 * thread per contact. Runs under the caller's RLS — the conversations_insert
 * policy requires account agent membership, which the caller already is.
 */
async function findOrCreateConversation(
  supabase: SendSupabase,
  accountId: string,
  userId: string,
  contactId: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: userId,
      contact_id: contactId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating conversation for contact send:', error.message)
    return null
  }

  return created.id
}