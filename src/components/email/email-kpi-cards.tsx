'use client'

import { EmailDashboardSummary } from '@/types/email'
import {
  Mail,
  UsersRound,
  Clock,
  AlertTriangle,
  Send,
  Inbox,
  Activity,
  CheckCircle2,
} from 'lucide-react'

interface EmailKpiCardsProps {
  summary: EmailDashboardSummary | null
  loading: boolean
}

export function EmailKpiCards({ summary, loading }: EmailKpiCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-border bg-card/60 animate-pulse p-4"
          />
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Monitored Mailboxes',
      value: `${summary.connectedMailboxes} / ${summary.totalSalesMembers}`,
      subtitle: `${summary.activeSubscriptions} active webhooks`,
      icon: UsersRound,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Active Threads',
      value: summary.openThreads.toString(),
      subtitle: `${summary.unreadThreads} unread messages`,
      icon: Mail,
      color: 'text-[#2B60DE]',
      bgColor: 'bg-blue-600/10 border-blue-600/20',
    },
    {
      title: 'Waiting for Rep Reply',
      value: summary.waitingForEmployee.toString(),
      subtitle: `${summary.overdueThreads} overdue SLA breaches`,
      icon: AlertTriangle,
      color: summary.overdueThreads > 0 ? 'text-[#2B60DE]' : 'text-amber-500',
      bgColor:
        summary.overdueThreads > 0
          ? 'bg-blue-600/10 border-blue-600/30'
          : 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Avg First Response',
      value: `${summary.avgResponseTimeMinutes}m`,
      subtitle: 'Across all active threads',
      icon: Clock,
      color: 'text-[#2B60DE]',
      bgColor: 'bg-blue-600/10 border-blue-600/20',
    },
    {
      title: 'Sent Today',
      value: summary.emailsSentToday.toString(),
      subtitle: 'CEO & Rep outbound',
      icon: Send,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'Received Today',
      value: summary.emailsReceivedToday.toString(),
      subtitle: 'Inbound client emails',
      icon: Inbox,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Waiting for Client',
      value: summary.waitingForClient.toString(),
      subtitle: 'Awaiting client response',
      icon: Activity,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/10 border-slate-500/20',
    },
    {
      title: 'Sync Status',
      value: summary.syncErrorsCount === 0 ? 'Optimal' : `${summary.syncErrorsCount} Errors`,
      subtitle: summary.syncErrorsCount === 0 ? 'All mailboxes healthy' : 'Sync attention required',
      icon: summary.syncErrorsCount === 0 ? CheckCircle2 : AlertTriangle,
      color: 'text-[#2B60DE]',
      bgColor: 'bg-blue-600/10 border-blue-600/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </span>
              <div
                className={`p-2 rounded-full border ${card.bgColor} ${card.color} shrink-0`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
