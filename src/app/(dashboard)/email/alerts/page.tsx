'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, Server, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmailAlert {
  id: string
  type: 'overdue_response' | 'mailbox_disconnected' | 'sync_failure' | 'subscription_expired'
  severity: 'warning' | 'critical'
  title: string
  description: string
  timestamp: string
  metadata?: {
    thread_id?: string
    account_id?: string
  }
}

export default function EmailAlertsPage() {
  const [alerts, setAlerts] = useState<EmailAlert[]>([])
  const [loading, setLoading] = useState(true)

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email/alerts')
      if (res.ok) {
        const json = await res.json()
        setAlerts(json.alerts || [])
      }
    } catch {
      toast.error('Failed to load email alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const overdueAlerts = alerts.filter((a) => a.type === 'overdue_response')
  const infraAlerts = alerts.filter((a) => a.type !== 'overdue_response')

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Email Operations Exceptions & Alerts
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time monitoring of overdue client emails, mailbox disconnections, and sync warnings.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadAlerts}
          disabled={loading}
          className="gap-1.5 h-8 text-xs rounded-full"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overdue SLA Breaches Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2B60DE]" />
            Overdue Client Responses ({overdueAlerts.length})
          </h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : overdueAlerts.length === 0 ? (
          <div className="p-6 rounded-xl border border-border bg-card text-center text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2B60DE]" />
            <span className="text-xs">No overdue emails! All client responses are within SLA thresholds.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {overdueAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-xl border border-blue-600/30 bg-blue-600/5 flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-full bg-blue-600/10 text-[#2B60DE] shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {alert.title}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.description}
                    </p>
                    <span className="text-[11px] text-muted-foreground mt-1">
                      Received: {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {alert.metadata?.thread_id && (
                  <Link
                    href={`/email/inbox?thread_id=${alert.metadata.thread_id}`}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#2B60DE] hover:underline"
                  >
                    Reply Now <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Infrastructure & Sync Alerts */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-500" />
            Infrastructure & Connection Alerts ({infraAlerts.length})
          </h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : infraAlerts.length === 0 ? (
          <div className="p-6 rounded-xl border border-border bg-card text-center text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2B60DE]" />
            <span className="text-xs">All monitored mailboxes and webhook subscriptions are functioning normally.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {infraAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'p-4 rounded-xl border flex items-center justify-between gap-4 shadow-sm',
                  alert.severity === 'critical'
                    ? 'border-blue-600/30 bg-blue-600/5'
                    : 'border-amber-500/30 bg-amber-500/5',
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      'p-2 rounded-full shrink-0 mt-0.5',
                      alert.severity === 'critical'
                        ? 'bg-blue-600/10 text-[#2B60DE]'
                        : 'bg-amber-500/10 text-amber-500',
                    )}
                  >
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {alert.title}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <Link
                  href="/email/accounts"
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#2B60DE] hover:underline"
                >
                  Manage Mailbox <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
