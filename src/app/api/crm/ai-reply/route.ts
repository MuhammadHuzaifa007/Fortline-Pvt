import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { findExistingContact } from '@/lib/contacts/dedupe'

let _adminClient: any = null

function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }

  return _adminClient
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const phone = String(body.phone || '').trim()
    const phoneNumberId = String(body.phone_number_id || '').trim()
    const reply = String(body.reply || '').trim()
    const timestamp =
      String(body.timestamp || '').trim() || new Date().toISOString()

    if (!phone) {
      return NextResponse.json(
        { error: 'Missing phone' },
        { status: 400 }
      )
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'Missing phone_number_id' },
        { status: 400 }
      )
    }

    if (!reply) {
      return NextResponse.json(
        { error: 'Missing reply' },
        { status: 400 }
      )
    }

    // ------------------------------------------------------------
    // 1. Resolve the correct CRM account from WhatsApp phone number ID
    // ------------------------------------------------------------

    const { data: configRows, error: configError } =
      await supabaseAdmin()
        .from('whatsapp_config')
        .select('account_id, user_id')
        .eq('phone_number_id', phoneNumberId)

    if (configError) {
      console.error('[ai-reply] config lookup failed:', configError)

      return NextResponse.json(
        { error: 'WhatsApp configuration lookup failed' },
        { status: 500 }
      )
    }

    if (!configRows || configRows.length === 0) {
      return NextResponse.json(
        {
          error: 'WhatsApp configuration not found',
          phone_number_id: phoneNumberId,
        },
        { status: 404 }
      )
    }

    if (configRows.length > 1) {
      return NextResponse.json(
        {
          error: 'Multiple WhatsApp configurations found',
          phone_number_id: phoneNumberId,
        },
        { status: 409 }
      )
    }

    const accountId = configRows[0].account_id

    // ------------------------------------------------------------
    // 2. Normalize phone exactly like the existing WhatsApp CRM flow
    // ------------------------------------------------------------

    const normalizedPhone = normalizePhone(phone)

    // ------------------------------------------------------------
    // 3. Find contact inside the correct CRM account
    // ------------------------------------------------------------

    const contact = await findExistingContact(
      supabaseAdmin(),
      accountId,
      normalizedPhone
    )

    if (!contact) {
      return NextResponse.json(
        {
          error: 'Contact not found',
          phone: normalizedPhone,
          account_id: accountId,
        },
        { status: 404 }
      )
    }

    // ------------------------------------------------------------
    // 4. Find the same conversation used by CRM inbox
    // ------------------------------------------------------------

    const { data: conversations, error: conversationError } =
      await supabaseAdmin()
        .from('conversations')
        .select('id')
        .eq('account_id', accountId)
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: true })
        .limit(1)

    if (conversationError) {
      console.error(
        '[ai-reply] conversation lookup failed:',
        conversationError
      )

      return NextResponse.json(
        { error: 'Conversation lookup failed' },
        { status: 500 }
      )
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json(
        {
          error: 'Conversation not found',
          contact_id: contact.id,
        },
        { status: 404 }
      )
    }

    const conversationId = conversations[0].id

    // ------------------------------------------------------------
    // 5. Save n8n AI reply into CRM messages table
    // ------------------------------------------------------------

    const crmMessageId =
      String(body.message_id || '').trim() ||
      `n8n-ai-${crypto.randomUUID()}`

    const { error: messageError } =
      await supabaseAdmin()
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          content_type: 'text',
          content_text: reply,
          message_id: crmMessageId,
          status: 'sent',
          created_at: timestamp,
        })

    if (messageError) {
      console.error('[ai-reply] message insert failed:', messageError)

      return NextResponse.json(
        {
          error: 'AI reply could not be saved',
          details: messageError.message,
        },
        { status: 500 }
      )
    }

    // ------------------------------------------------------------
    // 6. Update CRM conversation preview / latest message
    // ------------------------------------------------------------

    const { error: updateError } =
      await supabaseAdmin()
        .from('conversations')
        .update({
          last_message_text: reply,
          last_message_at: timestamp,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

    if (updateError) {
      console.error(
        '[ai-reply] conversation update failed:',
        updateError
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'AI reply saved to CRM',
        contact_id: contact.id,
        conversation_id: conversationId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[ai-reply] unexpected error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Internal server error',
      },
      { status: 500 }
    )
  }
}