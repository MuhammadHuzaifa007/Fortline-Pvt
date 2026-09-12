import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMail, replyToMessage, forwardMessage } from '@/lib/email/microsoft-graph'
import { calculateThreadMetrics } from '@/lib/email/response-metrics'
import { SendEmailPayload } from '@/types/email'

export async function POST(request: Request) {
  try {
    const ctx = await requireCeo()
    const body: SendEmailPayload = await request.json()
    const supabase = createAdminClient()

    if (!body.email_account_id) {
      return NextResponse.json(
        { error: 'email_account_id is required' },
        { status: 400 },
      )
    }

    // 1. Authoritative mailbox lookup from database (AGENTS.md §17, §18)
    const { data: account, error: accError } = await supabase
      .from('email_accounts')
      .select('id, email_address, sales_rep_id, authorization_status, connection_status')
      .eq('id', body.email_account_id)
      .single()

    if (accError || !account) {
      return NextResponse.json(
        { error: 'Invalid or unauthorized mailbox selected' },
        { status: 403 },
      )
    }

    const mailboxEmail = account.email_address
    const actorEmail = ctx.userEmail || 'ceo@fortline.net'

    // 2. Validate recipients & content
    if (!body.to || body.to.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 },
      )
    }

    if (!body.subject && !body.reply_to_message_id) {
      return NextResponse.json(
        { error: 'Subject is required for new messages' },
        { status: 400 },
      )
    }

    try {
      // 3. Dispatch to Microsoft Graph based on action
      if (body.is_forward && body.reply_to_message_id) {
        await forwardMessage(
          mailboxEmail,
          body.reply_to_message_id,
          body.to,
          body.body_html || body.body_text || '',
        )
      } else if (body.reply_to_message_id) {
        await replyToMessage(
          mailboxEmail,
          body.reply_to_message_id,
          body.body_html || body.body_text || '',
          body.is_reply_all,
        )
      } else {
        await sendMail(mailboxEmail, body)
      }

      // 4. If sending within an existing thread, update the thread & store local outbound message record
      let threadId = body.thread_id
      const nowIso = new Date().toISOString()
      const syntheticProviderMessageId = `sent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

      if (threadId) {
        // Record outbound message in database
        await supabase.from('email_messages').insert({
          thread_id: threadId,
          email_account_id: account.id,
          sales_rep_id: account.sales_rep_id,
          provider_message_id: syntheticProviderMessageId,
          provider_thread_id: threadId,
          direction: 'outbound',
          sender_email: mailboxEmail,
          sender_name: 'CEO (via Fortline Sales)',
          recipients: body.to,
          cc: body.cc || [],
          bcc: body.bcc || [],
          subject: body.subject || '',
          body_text: body.body_text || null,
          body_html: body.body_html || null,
          snippet: (body.body_text || body.body_html || '').substring(0, 150),
          sent_at: nowIso,
          received_at: nowIso,
          is_read: true,
          has_attachments: Boolean(body.attachments && body.attachments.length > 0),
          is_draft: false,
          is_automated: false,
        })

        // Recalculate thread metrics
        const { data: threadMessages } = await supabase
          .from('email_messages')
          .select('direction, sent_at, is_automated')
          .eq('thread_id', threadId)
          .order('sent_at', { ascending: true })

        if (threadMessages) {
          const metrics = calculateThreadMetrics(threadMessages)
          await supabase
            .from('email_threads')
            .update({
              last_message_at: nowIso,
              waiting_for: 'client',
              is_overdue: false,
              last_sender_type: 'employee',
              first_response_at: metrics.firstResponseAt,
              first_response_seconds: metrics.firstResponseSeconds,
              avg_response_seconds: metrics.avgResponseSeconds,
              updated_at: nowIso,
            })
            .eq('id', threadId)
        }
      }

      // 5. Create authoritative audit log (AGENTS.md §46)
      await supabase.from('email_audit_log').insert({
        actor_email: actorEmail,
        action: body.reply_to_message_id
          ? body.is_forward
            ? 'forward_email'
            : body.is_reply_all
              ? 'reply_all_email'
              : 'reply_email'
          : 'send_email',
        email_account_id: account.id,
        thread_id: threadId || null,
        mailbox_email: mailboxEmail,
        recipients: body.to,
        details: {
          subject: body.subject,
          is_reply: Boolean(body.reply_to_message_id),
          is_reply_all: Boolean(body.is_reply_all),
          is_forward: Boolean(body.is_forward),
          attachment_count: body.attachments?.length || 0,
        },
        result: 'success',
      })

      return NextResponse.json({
        success: true,
        sent_from: mailboxEmail,
        thread_id: threadId,
      })
    } catch (sendErr: unknown) {
      const errMsg = (sendErr as Error).message || 'Failed to send email via Microsoft Graph'

      // Log failed audit event
      await supabase.from('email_audit_log').insert({
        actor_email: actorEmail,
        action: 'send_email',
        email_account_id: account.id,
        mailbox_email: mailboxEmail,
        recipients: body.to,
        details: { subject: body.subject },
        result: 'failure',
        error_message: errMsg,
      })

      return NextResponse.json(
        { error: errMsg },
        { status: 500 },
      )
    }
  } catch (err) {
    return toErrorResponse(err)
  }
}
