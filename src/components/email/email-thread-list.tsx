'use client'

import { EmailThread } from '@/types/email'
import { Paperclip, Clock, AlertTriangle, CheckCircle2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailThreadListProps {
  threads: EmailThread[]
  selectedThreadId: string | null
  onSelectThread: (threadId: string) => void
  loading: boolean
}

export function EmailThreadList({
  threads,
  selectedThreadId,
  onSelectThread,
  loading,
}: EmailThreadListProps) {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-3.5 space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
            <div className="h-3.5 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <CheckCircle2 className="w-8 h-8 mb-2 opacity-40 text-[#2B60DE]" />
        <p className="text-sm font-medium">No email threads found</p>
        <p className="text-xs mt-1">Adjust your filters or sync mailboxes.</p>
      </div>
    )
  }

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-border/60">
      {threads.map((thread) => {
        const isSelected = thread.id === selectedThreadId
        const hasUnread = thread.unread_count > 0

        return (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelectThread(thread.id)}
            className={cn(
              'w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 relative border-l-2',
              isSelected
                ? 'bg-[#2B60DE]/10 border-l-[#2B60DE]'
                : hasUnread
                  ? 'bg-muted/30 hover:bg-muted/50 border-l-[#2B60DE]/60 font-medium'
                  : 'hover:bg-muted/20 border-l-transparent text-muted-foreground',
            )}
          >
            {/* Top row: Client name & time */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'text-xs truncate font-semibold',
                  hasUnread || isSelected ? 'text-foreground font-bold' : 'text-foreground/80',
                )}
              >
                {thread.client_name || thread.client_email}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatTimestamp(thread.last_message_at)}
              </span>
            </div>

            {/* Subject */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs truncate',
                  hasUnread ? 'text-foreground font-semibold' : 'text-foreground/90',
                )}
              >
                {thread.subject || '(No Subject)'}
              </span>
              {thread.has_attachments && (
                <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
            </div>

            {/* Rep & Badges row */}
            <div className="flex items-center justify-between gap-2 mt-0.5">
              {/* Sales Rep Attribution */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {thread.sales_member?.name || 'Sales Rep'}
                </span>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1 shrink-0">
                {thread.is_overdue && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Overdue
                  </span>
                )}

                {thread.waiting_for === 'employee' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Clock className="w-2.5 h-2.5" />
                    Needs Reply
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                    Replied
                  </span>
                )}

                {hasUnread && (
                  <span className="w-2 h-2 rounded-full bg-[#2B60DE] shrink-0" />
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
