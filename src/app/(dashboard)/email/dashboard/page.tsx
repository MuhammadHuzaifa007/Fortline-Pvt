'use client'

import { useEffect, useState } from 'react'
import { EmailDashboardSummary, EmailAccount } from '@/types/email'
import { EmailKpiCards } from '@/components/email/email-kpi-cards'
import { EmailComposer } from '@/components/email/email-composer'
import {
  Mail,
  Send,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  UsersRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'

export default function EmailDashboardPage() {
  const [summary, setSummary] = useState<EmailDashboardSummary | null>(null)
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, accRes] = await Promise.all([
        fetch('/api/email/dashboard'),
        fetch('/api/email/accounts'),
      ])

      if (dashRes.ok) {
        const json = await dashRes.json()
        setSummary(json.summary)
      }

      if (accRes.ok) {
        const json = await accRes.json()
        setAccounts(json.accounts || [])
      }
    } catch (err: unknown) {
      toast.error('Failed to load email dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSyncAll = async () => {
    setSyncingAll(true)
    toast.info('Starting sync for all monitored mailboxes...')
    try {
      let synced = 0
      for (const acc of accounts) {
        try {
          const res = await fetch(`/api/email/accounts/${acc.id}/sync`, { method: 'POST' })
          if (res.ok) synced++
        } catch {
          // ignore individual error
        }
      }
      toast.success(`Synchronized ${synced} of ${accounts.length} mailboxes`)
      loadData()
    } finally {
      setSyncingAll(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-[#0078D4] border border-blue-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Microsoft 365 Email Operations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Executive CEO monitoring for 30 sales team mailboxes, communications, and SLA compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncingAll || loading}
            className="gap-1.5 h-9 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            Sync All Mailboxes
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setComposerOpen(true)}
            className="gap-1.5 h-9 text-xs font-semibold bg-[#0078D4] hover:bg-[#0078D4]/90 text-white"
          >
            <Send className="w-3.5 h-3.5" />
            Compose (CEO Send-As)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <EmailKpiCards summary={summary} loading={loading} />

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inbox Link */}
        <Link
          href="/email/inbox"
          className="p-5 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Mail className="w-4 h-4" />
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              Unified Email Inbox &rarr;
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Read client threads, inspect email histories, and execute send-as replies across all 30 reps.
            </p>
          </div>
        </Link>

        {/* Sales Members Monitoring */}
        <Link
          href="/email/sales-members"
          className="p-5 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <UsersRound className="w-4 h-4" />
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors">
              Sales Rep Accountability &rarr;
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Monitor individual response times, unanswered threads, sent/received metrics, and client coverage.
            </p>
          </div>
        </Link>

        {/* Alerts & SLA breaches */}
        <Link
          href="/email/alerts"
          className="p-5 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-bold text-foreground group-hover:text-amber-500 transition-colors">
              SLA Exceptions & Alerts &rarr;
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Review overdue client inquiries, disconnected mailboxes, and automated sync alerts.
            </p>
          </div>
        </Link>
      </div>

      {/* Monitored Accounts Overview Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Monitored Sales Mailboxes ({accounts.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authoritative Microsoft 365 Exchange Online connections for all 30 sales team members.
            </p>
          </div>
          <Link
            href="/email/accounts"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Manage Accounts &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3">Sales Member</th>
                <th className="p-3">Email Mailbox</th>
                <th className="p-3">Connection</th>
                <th className="p-3">Sync Status</th>
                <th className="p-3">Last Sync</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.slice(0, 10).map((acc) => (
                <tr key={acc.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-semibold text-foreground">
                    {acc.sales_member?.name || acc.display_name}
                  </td>
                  <td className="p-3 font-mono text-muted-foreground">
                    {acc.email_address}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        acc.connection_status === 'connected'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {acc.connection_status}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="capitalize">{acc.sync_status}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {acc.last_sync_at
                      ? new Date(acc.last_sync_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/email/inbox?account_id=${acc.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      View Inbox &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Compose Modal */}
      {composerOpen && (
        <EmailComposer
          accounts={accounts}
          onClose={() => setComposerOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
