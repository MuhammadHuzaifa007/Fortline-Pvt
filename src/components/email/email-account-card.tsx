'use client'

import { useState } from 'react'
import { EmailAccount } from '@/types/email'
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Clock,
  User,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EmailAccountCardProps {
  account: EmailAccount
  onRefreshed: () => void
}

export function EmailAccountCard({ account, onRefreshed }: EmailAccountCardProps) {
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const handleTestConnection = async () => {
    setTesting(true)
    try {
      const res = await fetch(`/api/email/accounts/${account.id}/test`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Connection failed')
      toast.success(json.message || 'Connection successful')
      onRefreshed()
    } catch (err: unknown) {
      toast.error((err as Error).message)
      onRefreshed()
    } finally {
      setTesting(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`/api/email/accounts/${account.id}/sync`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Sync failed')
      toast.success(`Sync complete (${json.messagesSynced} messages processed)`)
      onRefreshed()
    } catch (err: unknown) {
      toast.error((err as Error).message)
      onRefreshed()
    } finally {
      setSyncing(false)
    }
  }

  const isConnected = account.connection_status === 'connected'
  const isError = account.connection_status === 'error' || account.sync_status === 'failed'

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return 'Never'
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col justify-between p-4 rounded-xl border bg-card shadow-sm transition-all',
        isConnected
          ? 'border-border hover:border-primary/40'
          : isError
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-border/60 opacity-90',
      )}
    >
      <div>
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
                isConnected
                  ? 'bg-red-500/10 text-[#EA4335] border-red-500/20'
                  : 'bg-muted text-muted-foreground border-border',
              )}
            >
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-foreground truncate">
                {account.email_address}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {account.sales_member?.name || account.display_name || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0',
              isConnected
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : isError
                  ? 'bg-destructive/15 text-destructive border border-destructive/30'
                  : 'bg-muted text-muted-foreground border border-border',
            )}
          >
            {isConnected ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {account.connection_status}
          </span>
        </div>

        {/* Details / Metrics */}
        <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last Synced:
            </span>
            <span className="font-medium text-foreground">
              {formatTimestamp(account.last_sync_at)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span>Sync History Window:</span>
            <span className="font-medium text-foreground">
              {account.historical_sync_days || 30} days
            </span>
          </div>

          {account.last_error_message && (
            <p className="text-[10px] text-destructive bg-destructive/10 p-1.5 rounded border border-destructive/20 mt-1 line-clamp-2">
              {account.last_error_message}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={testing || syncing}
          className="flex-1 h-7 text-xs gap-1"
        >
          {testing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Zap className="w-3 h-3 text-amber-500" />
          )}
          Test Connection
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSyncNow}
          disabled={testing || syncing}
          className="flex-1 h-7 text-xs gap-1"
        >
          {syncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 text-primary" />
          )}
          Sync Now
        </Button>
      </div>
    </div>
  )
}
