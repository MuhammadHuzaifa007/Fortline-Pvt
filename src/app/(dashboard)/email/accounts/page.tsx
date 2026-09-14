'use client'

import { useEffect, useState } from 'react'
import { EmailAccount } from '@/types/email'
import { EmailAccountCard } from '@/components/email/email-account-card'
import {
  Server,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Radio,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

export default function EmailAccountsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [syncingAll, setSyncingAll] = useState(false)
  const [renewingSubs, setRenewingSubs] = useState(false)

  const loadAccounts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email/accounts')
      if (res.ok) {
        const json = await res.json()
        setAccounts(json.accounts || [])
      }
    } catch {
      toast.error('Failed to load email accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleSyncAll = async () => {
    setSyncingAll(true)
    toast.info('Starting sync across all mailboxes...')
    try {
      let successCount = 0
      for (const acc of accounts) {
        try {
          const res = await fetch(`/api/email/accounts/${acc.id}/sync`, { method: 'POST' })
          if (res.ok) successCount++
        } catch {
          // ignore individual error
        }
      }
      toast.success(`Synced ${successCount} of ${accounts.length} mailboxes`)
      loadAccounts()
    } finally {
      setSyncingAll(false)
    }
  }

  const handleRenewWebhooks = async () => {
    setRenewingSubs(true)
    toast.info('Renewing Microsoft Graph webhook subscriptions...')
    try {
      const res = await fetch('/api/email/subscriptions/renew', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to renew subscriptions')
      toast.success(
        `Subscriptions updated: ${json.created} created, ${json.renewed} renewed`,
      )
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setRenewingSubs(false)
    }
  }

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.email_address.toLowerCase().includes(search.toLowerCase()) ||
      (acc.sales_member?.name &&
        acc.sales_member.name.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter ? acc.connection_status === statusFilter : true

    return matchesSearch && matchesStatus
  })

  const connectedCount = accounts.filter((a) => a.connection_status === 'connected').length
  const errorCount = accounts.filter(
    (a) => a.connection_status === 'error' || a.sync_status === 'failed',
  ).length

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-600/10 text-[#2B60DE] border border-blue-600/20">
              <Server className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Monitored Mailboxes & Infrastructure
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Microsoft 365 Exchange Online mailbox mappings, webhook subscriptions, and sync health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRenewWebhooks}
            disabled={renewingSubs}
            className="gap-1.5 h-9 text-xs rounded-full"
          >
            <Radio className={`w-3.5 h-3.5 ${renewingSubs ? 'animate-pulse' : ''}`} />
            Renew Webhooks
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="gap-1.5 h-9 text-xs font-semibold bg-[#2B60DE] hover:bg-[#2B60DE]/90 text-white rounded-full shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            Sync All Mailboxes
          </Button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Total Mailboxes</span>
            <div className="text-2xl font-bold text-foreground mt-1">{accounts.length}</div>
          </div>
          <Server className="w-6 h-6 text-muted-foreground/40" />
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Connected & Healthy</span>
            <div className="text-2xl font-bold text-[#2B60DE] mt-1">{connectedCount}</div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-[#2B60DE]/40" />
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold">Attention Required</span>
            <div className={`text-2xl font-bold mt-1 ${errorCount > 0 ? 'text-[#2B60DE]' : 'text-foreground'}`}>
              {errorCount}
            </div>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500/40" />
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search email or sales rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#2B60DE]"
          >
            <option value="">All Statuses</option>
            <option value="connected">Connected</option>
            <option value="disconnected">Disconnected</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Account Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-border bg-card/60 animate-pulse" />
          ))}
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <p className="text-sm font-medium">No mailboxes found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => (
            <EmailAccountCard
              key={account.id}
              account={account}
              onRefreshed={loadAccounts}
            />
          ))}
        </div>
      )}
    </div>
  )
}
