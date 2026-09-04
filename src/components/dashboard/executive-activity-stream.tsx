"use client"

import Link from 'next/link'
import {
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FortlineActivityItem } from '@/types/fortline'
import { formatDistanceToNow } from 'date-fns'

interface ExecutiveActivityStreamProps {
  activity: FortlineActivityItem[]
  loading?: boolean
}

export function ExecutiveActivityStream({
  activity,
  loading,
}: ExecutiveActivityStreamProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="h-5 w-48 bg-muted animate-pulse rounded mb-3" />
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Live WhatsApp Activity Stream
          </h3>
        </div>
        <Link
          href="/inbox"
          className="text-xs text-primary hover:underline font-medium"
        >
          View Full Inbox
        </Link>
      </div>

      <div className="divide-y divide-border/60 max-h-[360px] overflow-y-auto">
        {activity.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-xs">
            No recent WhatsApp messages recorded today.
          </div>
        ) : (
          activity.map((item) => {
            const isInbound = item.direction === 'inbound'
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })
              } catch {
                return 'recently'
              }
            })()

            return (
              <div
                key={item.id}
                className="p-3 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      'p-1.5 rounded-full shrink-0',
                      isInbound
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    )}
                    title={isInbound ? 'Customer Inbound' : 'Sales Rep Reply'}
                  >
                    {isInbound ? (
                      <ArrowDownLeft className="size-3.5" />
                    ) : (
                      <ArrowUpRight className="size-3.5" />
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-foreground truncate">
                        {item.contact_name}
                      </span>
                      {item.sales_member_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                          Rep: {item.sales_member_name}
                        </span>
                      )}
                      {item.division && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          • {item.division}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-[11px] mt-0.5 max-w-[340px]">
                      {item.snippet || '[Media message]'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {timeAgo}
                  </span>
                  <Link
                    href={`/inbox?conversation_id=${item.conversation_id}`}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Open thread in Inbox"
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
