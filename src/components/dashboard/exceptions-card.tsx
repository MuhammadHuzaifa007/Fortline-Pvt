"use client"

import Link from 'next/link'
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ExternalLink,
  Radio,
  UserX,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FortlineExceptionItem } from '@/types/fortline'
import { formatDistanceToNow } from 'date-fns'

interface ExceptionsCardProps {
  exceptions: FortlineExceptionItem[]
  loading?: boolean
}

export function ExceptionsCard({ exceptions, loading }: ExceptionsCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="h-5 w-40 bg-muted animate-pulse rounded mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/40 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const getIcon = (type: FortlineExceptionItem['type']) => {
    switch (type) {
      case 'unassigned_lead':
        return UserX
      case 'sla_breach':
      case 'unanswered_lead':
        return AlertOctagon
      case 'channel_disconnected':
        return Radio
      default:
        return AlertTriangle
    }
  }

  const getSeverityStyle = (severity: FortlineExceptionItem['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-rose-500 animate-ping" />
          <h3 className="text-sm font-semibold text-foreground">
            Operational Exceptions ({exceptions.length})
          </h3>
        </div>
        <Link
          href="/notifications"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          <span>All Alerts</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="divide-y divide-border/60 max-h-[360px] overflow-y-auto">
        {exceptions.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-foreground">Zero Open Exceptions</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              All 30 sales channels are operational and responding within SLA targets.
            </p>
          </div>
        ) : (
          exceptions.map((exc) => {
            const Icon = getIcon(exc.type)
            const severityStyle = getSeverityStyle(exc.severity)
            const timeAgo = (() => {
              try {
                const dt = exc.timestamp || exc.created_at
                return dt ? formatDistanceToNow(new Date(dt), { addSuffix: true }) : 'recently'
              } catch {
                return 'recently'
              }
            })()

            return (
              <div
                key={exc.id}
                className="p-3 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className={cn('p-1.5 rounded-md border mt-0.5', severityStyle)}>
                    <Icon className="size-3.5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{exc.title}</span>
                      <span
                        className={cn(
                          'text-[9px] uppercase px-1.5 py-0.2 rounded font-bold tracking-wider',
                          exc.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-500'
                            : 'bg-amber-500/20 text-amber-500'
                        )}
                      >
                        {exc.severity}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">{exc.description}</p>
                    <span className="text-[10px] text-muted-foreground/70">{timeAgo}</span>
                  </div>
                </div>

                {exc.action_link && (
                  <Link
                    href={exc.action_link}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-[11px] font-medium text-foreground transition-colors"
                  >
                    <span>Resolve</span>
                    <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
