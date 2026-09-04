"use client"

import { useState, useEffect } from 'react'
import { ShieldCheck, KeyRound, Clock, Eye, EyeOff, Loader2, RefreshCw, AlertCircle, FileText, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuditEvent {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  performed_by: string
  details: Record<string, any>
  created_at: string
}

export function FortlineSecurityAudit() {
  const { profile } = useAuth()
  const supabase = createClient()

  // Password state
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Audit log state
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [search, setSearch] = useState('')

  const fetchAuditLogs = async () => {
    setLoadingAudit(true)
    try {
      const res = await fetch('/api/fortline/audit?limit=50')
      if (!res.ok) throw new Error('Failed to fetch audit log')
      const json = await res.json()
      setAuditEvents(json.audit_events || [])
    } catch {
      // Graceful fallback to empty
      setAuditEvents([])
    } finally {
      setLoadingAudit(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.email) {
      toast.error('Cannot update password: No authenticated email.')
      return
    }
    if (next.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }
    if (next !== confirm) {
      toast.error('New passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: current,
      })
      if (signInError) {
        toast.error('Current password is incorrect.')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      })
      if (updateError) {
        toast.error(updateError.message || 'Failed to change password.')
        return
      }

      toast.success('CEO password changed successfully.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch {
      toast.error('An unexpected error occurred.')
    } finally {
      setSavingPassword(false)
    }
  }

  const filteredEvents = auditEvents.filter((ev) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      ev.action?.toLowerCase().includes(q) ||
      ev.entity_type?.toLowerCase().includes(q) ||
      ev.performed_by?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* CEO Password Panel */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">CEO Authentication & Credentials</h2>
            <p className="text-sm text-muted-foreground">
              Update password and credentials for the executive CEO portal account.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="mt-6 max-w-md space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-pass">Current Password</Label>
            <div className="relative">
              <Input
                id="current-pass"
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pass">New Password (min 8 characters)</Label>
            <div className="relative">
              <Input
                id="new-pass"
                type={showNext ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNext(!showNext)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showNext ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-pass">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-pass"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={savingPassword} className="gap-2 mt-2">
            {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Update CEO Password
          </Button>
        </form>
      </div>

      {/* Executive Audit Log */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Operational Audit Trail</h2>
              <p className="text-sm text-muted-foreground">
                Tamper-evident log of roster modifications, channel mappings, and KPI adjustments.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit actions..."
              className="w-48 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAuditLogs}
              disabled={loadingAudit}
              className="gap-1 text-xs"
            >
              <RefreshCw className={`size-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {loadingAudit ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="size-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium text-foreground">No audit entries recorded yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Modifications to sales members, KPI targets, or WhatsApp channels will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Entity</th>
                    <th className="py-2.5 px-3">Performed By</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3 text-muted-foreground/70" />
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {ev.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-foreground">
                        {ev.entity_type} {ev.entity_id ? `(${ev.entity_id.slice(0, 8)})` : ''}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {ev.performed_by}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px] max-w-xs truncate">
                        {JSON.stringify(ev.details || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
