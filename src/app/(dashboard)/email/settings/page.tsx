'use client'

import { useEffect, useState } from 'react'
import { EmailSettings } from '@/types/email'
import { Settings, Save, Clock, Calendar, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form states
  const [normalSla, setNormalSla] = useState(4)
  const [highSla, setHighSla] = useState(1)
  const [businessStart, setBusinessStart] = useState('09:00')
  const [businessEnd, setBusinessEnd] = useState('18:00')
  const [historicalDays, setHistoricalDays] = useState(30)
  const [timezone, setTimezone] = useState('UTC')

  useEffect(() => {
    fetch('/api/email/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setSettings(data.settings)
          setNormalSla(data.settings.normal_sla_hours)
          setHighSla(data.settings.high_priority_sla_hours)
          setBusinessStart(data.settings.business_hours_start)
          setBusinessEnd(data.settings.business_hours_end)
          setHistoricalDays(data.settings.historical_sync_days)
          setTimezone(data.settings.timezone)
        }
      })
      .catch(() => {
        toast.error('Failed to load email settings')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/email/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normal_sla_hours: Number(normalSla),
          high_priority_sla_hours: Number(highSla),
          business_hours_start: businessStart,
          business_hours_end: businessEnd,
          historical_sync_days: Number(historicalDays),
          timezone,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update settings')

      setSettings(json.settings)
      toast.success('Email CRM settings updated successfully')
    } catch (err: unknown) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2B60DE] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-blue-600/10 text-[#2B60DE] border border-blue-600/20">
            <Settings className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Email CRM Configuration & SLA Policies
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Configure response-time thresholds, business hours, and Microsoft 365 sync parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* SLA Section */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Clock className="w-4 h-4 text-[#2B60DE]" />
            <h2 className="text-sm font-bold text-foreground">SLA & Response Time Thresholds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Normal Thread SLA Target (Hours)
              </label>
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Maximum acceptable time before an unreplied client email is flagged as overdue.
              </p>
              <Input
                type="number"
                min="1"
                max="72"
                value={normalSla}
                onChange={(e) => setNormalSla(Number(e.target.value))}
                className="h-9 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                High-Priority SLA Target (Hours)
              </label>
              <p className="text-[11px] text-muted-foreground mb-1.5">
                Expedited response target for priority client accounts or urgent threads.
              </p>
              <Input
                type="number"
                min="1"
                max="24"
                value={highSla}
                onChange={(e) => setHighSla(Number(e.target.value))}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>
        </div>

        {/* Business Hours & Timezone */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Calendar className="w-4 h-4 text-[#2B60DE]" />
            <h2 className="text-sm font-bold text-foreground">Business Hours & Timezone</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Business Start Time</label>
              <Input
                type="time"
                value={businessStart}
                onChange={(e) => setBusinessStart(e.target.value)}
                className="h-9 text-xs mt-1.5"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Business End Time</label>
              <Input
                type="time"
                value={businessEnd}
                onChange={(e) => setBusinessEnd(e.target.value)}
                className="h-9 text-xs mt-1.5"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Timezone</label>
              <Input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="UTC, Asia/Karachi, etc."
                className="h-9 text-xs mt-1.5"
                required
              />
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-foreground">Sync & Historical Fetch Window</h2>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Initial Historical Sync Depth (Days)
            </label>
            <p className="text-[11px] text-muted-foreground mb-1.5">
              How far back Microsoft Graph pulls messages on first connection (recommended: 30 days).
            </p>
            <Input
              type="number"
              min="1"
              max="365"
              value={historicalDays}
              onChange={(e) => setHistoricalDays(Number(e.target.value))}
              className="h-9 text-xs max-w-xs"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="gap-1.5 h-9 text-xs font-semibold px-5 rounded-full bg-[#2B60DE] hover:bg-[#2B60DE]/90 text-white shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
