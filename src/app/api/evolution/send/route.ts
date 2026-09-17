import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEvolutionText } from '@/lib/evolution/evolution-api';

/**
 * POST /api/evolution/send
 *
 * CEO sends a text message through a specific sales member's Evolution
 * WhatsApp instance. Server-side only — the browser never sees the
 * Evolution API key.
 *
 * Body: { conversation_id: string, text: string }
 *
 * Flow:
 *   1. Auth check (CEO/agent)
 *   2. Load conversation → whatsapp_channel_id
 *   3. Load fortline_channels → gateway_instance_id + channel_type
 *   4. Load contact → phone
 *   5. Call Evolution API
 *   6. Return success — do NOT insert message (webhook handles that)
 */
export async function POST(request: Request) {
  try {
    const { accountId } = await requireRole('agent');

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const conversationId =
      typeof body.conversation_id === 'string'
        ? body.conversation_id.trim()
        : '';
    const text =
      typeof body.text === 'string' ? body.text.trim() : '';

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 },
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: 'Message text cannot be empty' },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();

    // 1. Load conversation
    const { data: conversation, error: convErr } = await admin
      .from('conversations')
      .select('id, contact_id, whatsapp_channel_id, account_id')
      .eq('id', conversationId)
      .eq('account_id', accountId)
      .maybeSingle();

    if (convErr) {
      console.error('[EVOLUTION SEND] Error loading conversation:', convErr);
      return NextResponse.json(
        { error: 'Failed to load conversation' },
        { status: 500 },
      );
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }

    if (!conversation.whatsapp_channel_id) {
      return NextResponse.json(
        { error: 'This conversation is not linked to a WhatsApp channel' },
        { status: 400 },
      );
    }

    // 2. Load fortline_channels for gateway_instance_id
    const { data: channel, error: chErr } = await admin
      .from('fortline_channels')
      .select('id, gateway_instance_id, channel_type, connection_status, sales_member_id')
      .eq('id', conversation.whatsapp_channel_id)
      .maybeSingle();

    if (chErr) {
      console.error('[EVOLUTION SEND] Error loading channel:', chErr);
      return NextResponse.json(
        { error: 'Failed to load WhatsApp channel' },
        { status: 500 },
      );
    }

    if (!channel) {
      return NextResponse.json(
        { error: 'WhatsApp channel not found for this conversation' },
        { status: 404 },
      );
    }

    if (channel.channel_type !== 'qr_gateway') {
      return NextResponse.json(
        { error: 'This channel is not a QR gateway/Evolution channel' },
        { status: 400 },
      );
    }

    if (!channel.gateway_instance_id) {
      return NextResponse.json(
        {
          error:
            'No Evolution instance configured for this channel. Reconnect the sales line in Settings.',
        },
        { status: 400 },
      );
    }

    if (channel.connection_status === 'disconnected') {
      return NextResponse.json(
        {
          error:
            'This WhatsApp line is disconnected. Reconnect it in Settings before sending.',
        },
        { status: 400 },
      );
    }

    // 3. Load contact phone
    const { data: contact, error: contactErr } = await admin
      .from('contacts')
      .select('id, phone, name')
      .eq('id', conversation.contact_id)
      .maybeSingle();

    if (contactErr) {
      console.error('[EVOLUTION SEND] Error loading contact:', contactErr);
      return NextResponse.json(
        { error: 'Failed to load contact' },
        { status: 500 },
      );
    }

    if (!contact || !contact.phone) {
      return NextResponse.json(
        { error: 'Contact phone number not found' },
        { status: 400 },
      );
    }

    // Normalize phone: strip non-digits
    const normalizedPhone = contact.phone.replace(/\D/g, '');
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Invalid contact phone number' },
        { status: 400 },
      );
    }

    // 4. Send via Evolution API
    const result = await sendEvolutionText(
      channel.gateway_instance_id,
      normalizedPhone,
      text,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message through Evolution' },
        { status: 502 },
      );
    }

    // Success — do NOT insert a message row. Evolution will emit a
    // fromMe=true webhook event and the existing webhook handler will
    // persist the outbound message. This prevents duplicate rows.
    return NextResponse.json({
      success: true,
      // Never return the API key or internal Evolution response details
      instance: channel.gateway_instance_id,
    });
  } catch (error) {
    console.error('[EVOLUTION SEND] Unhandled error:', error);
    return toErrorResponse(error);
  }
}
