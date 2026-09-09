import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeGatewayMessage } from '@/lib/gateway/normalize';

/**
 * Public Webhook for WhatsApp Multi-Device Gateway (Evolution API / Baileys).
 * Receives:
 * - connection.update / qrcode.updated (Session status, QR Code base64)
 * - messages.upsert (Both incoming customer chats and outgoing sales rep mobile replies)
 */
export async function POST(
  request: Request,
  context?: { params?: Promise<{ event?: string[] }> | { event?: string[] } }
) {
  try {
    const payload = await request.json();
    const resolvedParams = context?.params ? await Promise.resolve(context.params) : null;
    const urlEvent = resolvedParams?.event?.join('.');
    const rawEvent = payload?.event || payload?.type || urlEvent || '';
    const event = rawEvent.toLowerCase().replace(/[-_]/g, '.');
    const instance = payload?.instance || payload?.instanceName || '';

    if (!instance) {
      return NextResponse.json({ ok: false, error: 'Missing instance in webhook payload' }, { status: 400 });
    }

    const admin = supabaseAdmin();

    // 1. Resolve channel by gateway_instance_id
    const { data: channel, error: chErr } = await admin
      .from('fortline_channels')
      .select('*, sales_member:fortline_sales_members(*)')
      .eq('gateway_instance_id', instance)
      .maybeSingle();

    if (chErr || !channel) {
      return NextResponse.json({ ok: true, skipped: `unmapped_instance_${instance}` });
    }

    const accountId = channel.account_id;
    const salesMemberId = channel.sales_member_id;

    // 2. Handle Connection & QR Code updates
    if (
      event.includes('connection') ||
      event.includes('qrcode') ||
      event === 'connection.update' ||
      event === 'qrcode.updated'
    ) {
      const state = payload.data?.state || payload.data?.connection;
      const qrBase64 = payload.data?.qrcode?.base64 || payload.data?.qrcode || null;

      if (state === 'open' || state === 'connected') {
        await admin
          .from('fortline_channels')
          .update({
            pairing_state: 'connected',
            connection_status: 'connected',
            qr_code_raw: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', channel.id);

        if (salesMemberId) {
          await admin
            .from('fortline_sales_members')
            .update({
              presence_status: 'online',
              presence_source: 'channel_activity',
              last_activity_at: new Date().toISOString(),
              last_heartbeat_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', salesMemberId);
        }

        console.log(`[gateway-webhook] Channel ${channel.channel_name || instance} CONNECTED.`);
      } else if (state === 'close' || state === 'disconnected') {
        await admin
          .from('fortline_channels')
          .update({
            pairing_state: 'disconnected',
            connection_status: 'disconnected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', channel.id);

        if (salesMemberId) {
          await admin
            .from('fortline_sales_members')
            .update({
              presence_status: 'offline',
              updated_at: new Date().toISOString(),
            })
            .eq('id', salesMemberId);
        }

        console.log(`[gateway-webhook] Channel ${channel.channel_name || instance} DISCONNECTED.`);
      } else if (qrBase64) {
        await admin
          .from('fortline_channels')
          .update({
            pairing_state: 'qrcode',
            qr_code_raw: qrBase64,
            last_qr_generated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', channel.id);
      }

      return NextResponse.json({ ok: true, type: 'status_updated' });
    }

    // 3. Handle Message Upsert (Incoming customer lead or Outgoing sales rep reply)
    if (event.includes('messages.upsert') || event.includes('messages_upsert') || event === 'messages.upsert') {
      const norm = normalizeGatewayMessage(payload);
      if (!norm) {
        return NextResponse.json({ ok: true, skipped: 'unparseable_or_broadcast' });
      }

      // Check if message already exists
      const { data: existingMsg } = await admin
        .from('messages')
        .select('id')
        .eq('message_id', norm.messageId)
        .maybeSingle();

      if (existingMsg) {
        return NextResponse.json({ ok: true, skipped: 'already_recorded' });
      }

      // Resolve contact (find or create)
      let contactId: string | null = null;
      const { data: existingContact } = await admin
        .from('contacts')
        .select('id, name')
        .eq('account_id', accountId)
        .eq('phone', norm.customerPhone)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        if (norm.customerName && (!existingContact.name || existingContact.name === norm.customerPhone)) {
          await admin
            .from('contacts')
            .update({ name: norm.customerName })
            .eq('id', contactId);
        }
      } else {
        const { data: newContact, error: contErr } = await admin
          .from('contacts')
          .insert({
            account_id: accountId,
            phone: norm.customerPhone,
            name: norm.customerName || norm.customerPhone,
            assigned_sales_member_id: salesMemberId || null,
          })
          .select('id')
          .single();

        if (contErr || !newContact) {
          console.error('[gateway-webhook] Failed to create contact:', contErr);
          return NextResponse.json({ ok: false, error: contErr?.message }, { status: 500 });
        }
        contactId = newContact.id;
      }

      // Resolve conversation (find or create)
      let conversationId: string | null = null;
      let existingConvUnread = 0;
      const { data: existingConv } = await admin
        .from('conversations')
        .select('id, unread_count, assigned_sales_member_id')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        existingConvUnread = existingConv.unread_count || 0;
      } else {
        const { data: newConv, error: convErr } = await admin
          .from('conversations')
          .insert({
            account_id: accountId,
            contact_id: contactId,
            assigned_sales_member_id: salesMemberId || null,
            channel_phone_number_id: channel.phone_number_id || null,
            status: 'open',
            is_unanswered: !norm.isFromMe,
            unread_count: norm.isFromMe ? 0 : 1,
            last_message_at: norm.timestamp,
            last_message_preview: norm.text ? norm.text.slice(0, 100) : '',
          })
          .select('id')
          .single();

        if (convErr || !newConv) {
          console.error('[gateway-webhook] Failed to create conversation:', convErr);
          return NextResponse.json({ ok: false, error: convErr?.message }, { status: 500 });
        }
        conversationId = newConv.id;
      }

      // Insert message
      const { error: msgErr } = await admin.from('messages').insert({
        conversation_id: conversationId,
        sender_type: norm.senderType === 'agent' ? 'user' : 'contact',
        content: norm.text,
        media_url: norm.mediaUrl || null,
        media_type: norm.mediaType || 'text',
        message_id: norm.messageId,
        status: 'delivered',
        created_at: norm.timestamp,
        channel_phone_number_id: channel.phone_number_id || null,
        sales_member_id: salesMemberId || null,
      });

      if (msgErr) {
        console.error('[gateway-webhook] Failed to insert message:', msgErr);
        return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
      }

      // Update conversation timestamps and SLA state
      await admin
        .from('conversations')
        .update({
          last_message_at: norm.timestamp,
          last_message_preview: norm.text ? norm.text.slice(0, 100) : '',
          is_unanswered: !norm.isFromMe, // False if sales rep answered!
          unread_count: norm.isFromMe ? 0 : existingConvUnread + 1,
          assigned_sales_member_id: salesMemberId || undefined,
          channel_phone_number_id: channel.phone_number_id || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Update sales member presence & metrics
      if (salesMemberId) {
        const memberUpdates: Record<string, unknown> = {
          last_activity_at: norm.timestamp,
          presence_status: 'online',
          presence_source: 'channel_activity',
          updated_at: new Date().toISOString(),
        };

        if (norm.isFromMe) {
          memberUpdates.last_outbound_at = norm.timestamp;
        } else {
          memberUpdates.last_inbound_at = norm.timestamp;
        }

        await admin
          .from('fortline_sales_members')
          .update(memberUpdates)
          .eq('id', salesMemberId);
      }

      return NextResponse.json({ ok: true, messageId: norm.messageId });
    }

    return NextResponse.json({ ok: true, unhandledEvent: event });
  } catch (err: any) {
    console.error('[gateway-webhook] Exception:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
