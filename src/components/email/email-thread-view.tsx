'use client'

import { useState } from 'react'
import { EmailThread, EmailMessage, EmailAccount } from '@/types/email'
import { EmailMessageCard } from './email-message-card'
import { EmailComposer } from './email-composer'
import {
  Reply,
  ReplyAll,
  Forward,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Building,
  Mail,
  Calendar,
  Lock,
  Unlock,
  Flag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmailThreadViewProps {
  thread: EmailThread | null
  accounts: EmailAccount[]
  onThreadUpdated: () => void
}

export function EmailThreadView({
  thread,
  accounts,
  onThreadUpdated,
}: EmailThreadViewProps) {
  const [composerOpen, setComposerOpen] = useState(false)
  const [replyMessage, setReplyMessage] = useState<EmailMessage | null>(null)
  const [isReplyAll, setIsReplyAll] = useState(false)
  const [isForward, setIsForward] = useState(false)
  const [updating, setUpdating] = useState(false)

  if (!thread) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground bg-muted/5">
        <Mail className="w-12 h-12 mb-3 opacity-25 text-[#2B60DE]" />
        <p className="text-base font-semibold text-foreground">Select an Email Conversation</p>
        <p className="text-xs max-w-sm mt-1">
          Choose a thread from the inbox list on the left to monitor, reply, or forward messages.
        </p>
      </div>
    )
  }

  const messages = thread.messages || []
  const lastMessage = messages[messages.length - 1]

  const handleOpenReply = (message: EmailMessage, all: boolean) => {
    setReplyMessage(message)
    setIsReplyAll(all)
    setIsForward(false)
    setComposerOpen(true)
  }

  const handleOpenForward = (message: EmailMessage) => {
    setReplyMessage(message)
    setIsReplyAll(false)
    setIsForward(true)
    setComposerOpen(true)
  }

  const handleToggleStatus = async () => {
    const nextStatus = thread.status === 'open' ? 'closed' : 'open'
    setUpdating(true)
    try {
      const res = await fetch(`/api/email/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error('Failed to update thread status')
      toast.success(`Thread marked as ${nextStatus}`)
      onThreadUpdated()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  const handleTogglePriority = async () => {
    const nextPriority = thread.priority === 'normal' ? 'high' : 'normal'
    setUpdating(true)
    try {
      const res = await fetch(`/api/email/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: nextPriority }),
      })
      if (!res.ok) throw new Error('Failed to update thread priority')
      toast.success(`Priority set to ${nextPriority}`)
      onThreadUpdated()
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
      {/* Thread Header */}
      <div className="p-4 border-b border-border bg-card flex flex-col gap-2 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground truncate">
                {thread.subject || '(No Subject)'}
              </h2>
              {thread.priority === 'high' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                  <Flag className="w-2.5 h-2.5" /> High Priority
                </span>
              )}
              {thread.is_overdue && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                  <AlertTriangle className="w-2.5 h-2.5" /> SLA Breached
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-[#2B60DE]" />
                <span className="text-foreground font-semibold">
                  {thread.client_name || thread.client_email}
                </span>
              </span>
              <span>&bull;</span>
              <span>Monitored Rep: <strong>{thread.sales_member?.name || 'Sales Rep'}</strong></span>
              <span>&bull;</span>
              <span>Mailbox: {thread.email_account?.email_address}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTogglePriority}
              disabled={updating}
              className="h-8 text-xs rounded-full"
            >
              <Flag className={cn('w-3.5 h-3.5 mr-1', thread.priority === 'high' && 'text-[#2B60DE] fill-[#2B60DE]')} />
              {thread.priority === 'high' ? 'High' : 'Normal'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={updating}
              className="h-8 text-xs rounded-full"
            >
              {thread.status === 'open' ? (
                <>
                  <Lock className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  Close Thread
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5 mr-1 text-[#2B60DE]" />
                  Reopen
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="flex items-center gap-4 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              Waiting for:{' '}
              <strong className={thread.waiting_for === 'employee' ? 'text-amber-500' : 'text-foreground'}>
                {thread.waiting_for === 'employee' ? 'Sales Rep Reply' : 'Client Response'}
              </strong>
            </span>
          </div>

          {thread.first_response_seconds !== null && thread.first_response_seconds !== undefined && (
            <div className="flex items-center gap-1">
              <span>First Response: <strong>{Math.round(thread.first_response_seconds / 60)} min</strong></span>
            </div>
          )}

          {thread.avg_response_seconds !== null && thread.avg_response_seconds !== undefined && (
            <div className="flex items-center gap-1">
              <span>Avg Response: <strong>{Math.round(thread.avg_response_seconds / 60)} min</strong></span>
            </div>
          )}

          <div className="ml-auto">
            <span>{messages.length} messages in thread</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <EmailMessageCard
            key={message.id}
            message={message}
            onReply={handleOpenReply}
            onForward={handleOpenForward}
          />
        ))}
      </div>

      {/* Quick Reply Footer */}
      {lastMessage && (
        <div className="p-3 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenReply(lastMessage, false)}
              className="gap-1.5 h-8 text-xs font-semibold rounded-full bg-[#2B60DE] hover:bg-[#2B60DE]/90 text-white shadow-sm px-4"
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenReply(lastMessage, true)}
              className="gap-1.5 h-8 text-xs rounded-full px-4"
            >
              <ReplyAll className="w-3.5 h-3.5" />
              Reply All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenForward(lastMessage)}
              className="gap-1.5 h-8 text-xs rounded-full px-4"
            >
              <Forward className="w-3.5 h-3.5" />
              Forward
            </Button>
          </div>

          <span className="text-xs text-muted-foreground">
            Sending from: <strong>{thread.email_account?.email_address}</strong>
          </span>
        </div>
      )}

      {/* Email Composer Modal */}
      {composerOpen && (
        <EmailComposer
          accounts={accounts}
          defaultAccountId={thread.email_account_id}
          initialTo={
            isForward
              ? []
              : isReplyAll
                ? [
                    { email: replyMessage?.sender_email || thread.client_email },
                    ...(replyMessage?.recipients || []).filter(
                      (r) => r.email !== thread.email_account?.email_address,
                    ),
                  ]
                : [{ email: replyMessage?.sender_email || thread.client_email }]
          }
          initialCc={isReplyAll ? replyMessage?.cc || [] : []}
          initialSubject={
            isForward
              ? `Fwd: ${thread.subject}`
              : thread.subject?.startsWith('Re:')
                ? thread.subject
                : `Re: ${thread.subject}`
          }
          replyToMessageId={replyMessage?.provider_message_id}
          threadId={thread.id}
          isReplyAll={isReplyAll}
          isForward={isForward}
          onClose={() => setComposerOpen(false)}
          onSuccess={onThreadUpdated}
        />
      )}
    </div>
  )
}
