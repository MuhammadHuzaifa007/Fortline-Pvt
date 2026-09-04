"use client"

import { useState, useEffect } from 'react'
import { Timer, Save, Loader2, Clock, BellRing, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FortlineKpiConfig } from '@/types/fortline'

export function FortlineKpiSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<FortlineKpiConfig | null>(null)

  // Form states in minutes for friendly CEO editing
  const [firstResponseMins, setFirstResponseMins] = useState(15)
  const [overdueMins, setOverdueMins] = useState(30)
  const [inactivityHours, setInactivityHours] = useState(2)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [escalationEmail, setEscalationEmail] = useState('')

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/fortline/kpis')
        if (res.ok) {
          const data = await res.json()
          if (data.config) {
            setConfig(data.config)
            setFirstResponseMins(Math.round(data.config.first_response_target_seconds / 60))
            setOverdueMins(Math.round(data.config.overdue_conversation_seconds / 60))
            setInactivityHours(Math.round(data.config.inactivity_alert_threshold_seconds / 3600))
            setStartTime(data.config.business_hours_start || '09:00')
            setEndTime(data.config.business_hours_end || '18:00')
            setEscalationEmail(data.config.sla_escalation_email || '')
          }
        }
      } catch {
        toast.error('Failed to load KPI configuration')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/fortline/kpis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_response_target_seconds: firstResponseMins * 60,
          overdue_conversation_seconds: overdueMins * 60,
          inactivity_alert_threshold_seconds: inactivityHours * 3600,
          business_hours_start: startTime,
          business_hours_end: endTime,
          sla_escalation_email: escalationEmail.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success('KPI & SLA thresholds saved successfully')
      } else {
        toast.error('Failed to save KPI configuration')
      }
    } catch {
      toast.error('Network error saving KPI configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-2.5 pb-4 border-b border-border">
        <span className="p-2 rounded-lg bg-primary/10 text-primary">
          <Timer className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            KPI & SLA Threshold Configuration
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure response time targets, overdue conversation triggers, and executive escalation rules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target First Response Time (Minutes)</Label>
            <Input
              type="number"
              min={1}
              max={240}
              value={firstResponseMins}
              onChange={(e) => setFirstResponseMins(parseInt(e.target.value) || 15)}
              className="bg-muted border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Conversations waiting longer than this trigger SLA breach warnings.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Overdue Chat Threshold (Minutes)</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={overdueMins}
              onChange={(e) => setOverdueMins(parseInt(e.target.value) || 30)}
              className="bg-muted border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Unanswered inquiries past this limit flag as Overdue in the CEO dashboard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sales Rep Inactivity Warning (Hours)</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={inactivityHours}
              onChange={(e) => setInactivityHours(parseInt(e.target.value) || 2)}
              className="bg-muted border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Flags a sales rep as inactive if no WhatsApp activity occurs during shift.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Executive Escalation Email</Label>
            <Input
              type="email"
              value={escalationEmail}
              onChange={(e) => setEscalationEmail(e.target.value)}
              placeholder="ceo@fortline.com"
              className="bg-muted border-border"
            />
            <p className="text-[11px] text-muted-foreground">
              Receives instant alert digests when SLA breaches exceed threshold.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" />
            Standard Business Operating Hours
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Shift Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Shift End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-muted border-border"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>Save KPI & SLA Thresholds</span>
          </Button>
        </div>
      </form>
    </div>
  )
}
