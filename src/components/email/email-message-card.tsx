'use client'

import { useState } from 'react'
import { EmailMessage } from '@/types/email'
import { sanitizeEmailHtml } from './email-sanitizer'
import {
  Paperclip,
  Download,
  Reply,
  ReplyAll,
  Forward,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmailMessageCardProps {
  message: EmailMessage
  onReply: (message: EmailMessage, replyAll: boolean) => void
  onForward: (message: EmailMessage) => void
}

export function EmailMessageCard({
  message,
  onReply,
  onForward,
}: EmailMessageCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showHeaders, setShowHeaders] = useState(false)

  const isOutbound = message.direction === 'outbound'
  const sanitizedHtml = message.body_html ? sanitizeEmailHtml(message.body_html) : null

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isOutbound
          ? 'bg-blue-500/5 border-blue-500/20'
          : 'bg-card border-border shadow-sm',
      )}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3.5 gap-2 border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              'bg-[#2B60DE]/15 text-[#2B60DE] border border-[#2B60DE]/30',
            )}
          >
            {(message.sender_name || message.sender_email || '?').charAt(0).toUpperCase()}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground truncate">
                {message.sender_name || message.sender_email}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider',
                  'bg-blue-600/10 text-[#2B60DE]',
                )}
              >
                {isOutbound ? 'Outbound' : 'Inbound'}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              {message.sender_email}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] text-muted-foreground mr-1">
            {formatDateTime(message.sent_at)}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReply(message, false)}
            className="h-7 w-7 p-0"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReply(message, true)}
            className="h-7 w-7 p-0"
            title="Reply All"
          >
            <ReplyAll className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onForward(message)}
            className="h-7 w-7 p-0"
            title="Forward"
          >
            <Forward className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 flex flex-col gap-3">
          {/* Detailed recipient headers toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowHeaders(!showHeaders)}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <span>To: {message.recipients.map((r) => r.name || r.email).join(', ')}</span>
              {showHeaders ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showHeaders && (
              <div className="mt-2 p-2 rounded-md bg-muted/40 text-[11px] space-y-1 font-mono">
                <div>
                  <span className="font-semibold text-muted-foreground">From: </span>
                  {message.sender_name} &lt;{message.sender_email}&gt;
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">To: </span>
                  {message.recipients.map((r) => `${r.name || ''} <${r.email}>`).join(', ')}
                </div>
                {message.cc && message.cc.length > 0 && (
                  <div>
                    <span className="font-semibold text-muted-foreground">CC: </span>
                    {message.cc.map((r) => `${r.name || ''} <${r.email}>`).join(', ')}
                  </div>
                )}
                <div>
                  <span className="font-semibold text-muted-foreground">Date: </span>
                  {formatDateTime(message.sent_at)}
                </div>
              </div>
            )}
          </div>

          {/* Email Body */}
          <div className="text-xs text-foreground leading-relaxed overflow-x-auto min-h-[60px]">
            {sanitizedHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                className="prose prose-sm dark:prose-invert max-w-none break-words"
              />
            ) : (
              <p className="whitespace-pre-wrap">{message.body_text || message.snippet || '(No content)'}</p>
            )}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                <Paperclip className="w-3 h-3" />
                Attachments ({message.attachments.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {message.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/email/attachments/${message.id}/${att.provider_attachment_id}`}
                    download={att.filename}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#2B60DE] shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate max-w-[180px] font-medium">
                        {att.filename}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatFileSize(att.size_bytes)}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
