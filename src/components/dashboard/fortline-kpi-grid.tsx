"use client"

import {
  Users,
  Wifi,
  Clock,
  UserX,
  Radio,
  UserPlus,
  Inbox,
  Send,
  Timer,
  AlertTriangle,
  AlertOctagon,
  Flame,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FortlineDashboardKPIs } from '@/types/fortline'

interface FortlineKpiGridProps {
  kpis: FortlineDashboardKPIs
  loading?: boolean
}

export function FortlineKpiGrid({ kpis, loading }: FortlineKpiGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-card/60 animate-pulse p-3" />
        ))}
      </div>
    )
  }

  const items = [
    // Group 1: Team & Presence
    {
      id: 'total-members',
      title: 'Sales Roster',
      value: kpis.totalSalesMembers,
      icon: Users,
      badge: '30 Reps',
      color: 'text-foreground',
      bg: 'bg-muted/50',
    },
    {
      id: 'online-members',
      title: 'Online Now',
      value: kpis.onlineSalesMembers,
      icon: Wifi,
      badge: 'Active ≤5m',
      color: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'away-members',
      title: 'Away',
      value: kpis.awaySalesMembers,
      icon: Clock,
      badge: 'Idle ≤60m',
      color: 'text-amber-500 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'offline-members',
      title: 'Offline',
      value: kpis.offlineSalesMembers,
      icon: UserX,
      badge: '> 1h idle',
      color: 'text-muted-foreground',
      bg: 'bg-muted/30',
    },
    {
      id: 'active-channels',
      title: 'Active Channels',
      value: kpis.activeChannels,
      icon: Radio,
      badge: 'WhatsApp',
      color: 'text-teal-500 dark:text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
    },
    // Group 2: Traffic & Lead Flow
    {
      id: 'new-leads',
      title: 'New Leads Today',
      value: kpis.newLeadsToday,
      icon: UserPlus,
      badge: 'Inbound Clients',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
    {
      id: 'msgs-received',
      title: 'Received Today',
      value: kpis.messagesReceivedToday,
      icon: Inbox,
      badge: 'Inbound Msgs',
      color: 'text-blue-500 dark:text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'msgs-sent',
      title: 'Sent Today',
      value: kpis.messagesSentToday,
      icon: Send,
      badge: 'Outbound Msgs',
      color: 'text-sky-500 dark:text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      id: 'avg-resp-time',
      title: 'Avg First Reply',
      value: (kpis.avgFirstResponseTimeMinutes ?? 0) > 0 ? `${kpis.avgFirstResponseTimeMinutes}m` : '< 1m',
      icon: Timer,
      badge: 'Target ≤15m',
      color: (kpis.avgFirstResponseTimeMinutes ?? 0) > 15 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400',
      bg: (kpis.avgFirstResponseTimeMinutes ?? 0) > 15 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'pending-work',
      title: 'Pending In-Progress',
      value: kpis.pendingInternalWork,
      icon: FileSpreadsheet,
      badge: 'Open Deals',
      color: 'text-indigo-500 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    // Group 3: Urgent CEO Attention & Exceptions
    {
      id: 'unanswered',
      title: 'Unanswered',
      value: kpis.unansweredConversations,
      icon: Flame,
      badge: 'Needs Reply',
      color: kpis.unansweredConversations > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground',
      bg: kpis.unansweredConversations > 0 ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20' : 'bg-card',
    },
    {
      id: 'overdue',
      title: 'Overdue Chats',
      value: kpis.overdueConversations,
      icon: AlertTriangle,
      badge: '> 30m unreplied',
      color: kpis.overdueConversations > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-muted-foreground',
      bg: kpis.overdueConversations > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-card',
    },
    {
      id: 'sla-breaches',
      title: 'SLA Breaches',
      value: kpis.slaBreaches,
      icon: AlertOctagon,
      badge: 'Critical',
      color: kpis.slaBreaches > 0 ? 'text-rose-500 dark:text-rose-400 font-black' : 'text-emerald-500',
      bg: kpis.slaBreaches > 0 ? 'bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/30' : 'bg-card',
    },
    {
      id: 'open-exceptions',
      title: 'Open Exceptions',
      value: kpis.openExceptions,
      icon: CheckCircle2,
      badge: 'Action Items',
      color: kpis.openExceptions > 0 ? 'text-purple-500 dark:text-purple-400' : 'text-emerald-500',
      bg: kpis.openExceptions > 0 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-card',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.id}
            className={cn(
              'relative rounded-xl border border-border p-3 transition-all hover:shadow-sm flex flex-col justify-between',
              item.bg
            )}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs font-medium text-muted-foreground line-clamp-1">
                {item.title}
              </span>
              <Icon className={cn('size-3.5 shrink-0', item.color)} />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className={cn('text-2xl font-bold tabular-nums tracking-tight', item.color)}>
                {item.value}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-background/60">
                {item.badge}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
