"use client"

import { useState } from 'react'
import { BellRing, Save, Loader2, ShieldAlert, CheckCircle2, Mail, AlertTriangle } from 'lucide-react'
import { WhatsAppChatsIcon } from '@/components/icons/whatsapp-business-logo'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NotificationRules {
  alert_sla_breach: boolean
  alert_unassigned_lead: boolean
  alert_channel_disconnect: boolean
  alert_rep_inactivity: boolean
  daily_executive_digest: boolean
  ceo_whatsapp_number: string
  ceo_alert_email: string
  quiet_hours_start: string
  quiet_hours_end: string
}

export function FortlineNotificationsSettings() {
  const [saving, setSaving] = useState(false)
  const [rules, setRules] = useState<NotificationRules>({
    alert_sla_breach: true,
    alert_unassigned_lead: true,
    alert_channel_disconnect: true,
    alert_rep_inactivity: false,
    daily_executive_digest: true,
    ceo_whatsapp_number: '+92 300 1234567',
    ceo_alert_email: 'ceo@fortline.com',
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/fortline/kpis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_on_breach: rules.alert_sla_breach,
          alert_on_unassigned: rules.alert_unassigned_lead,
        }),
      })
      if (!res.ok) throw new Error('Failed to update rules')
      toast.success('Executive notification rules saved')
    } catch {
      toast.error('Failed to save notification rules')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BellRing className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Executive Alert Rules</h2>
          <p className="text-sm text-muted-foreground">
            Configure automated escalation alerts and direct CEO WhatsApp notifications for operational breaches.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        {/* Urgent Trigger Toggles */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operational Escalation Triggers
          </h3>

          <div className="space-y-3">
            <label className="flex items-start justify-between rounded-lg border border-border/80 bg-background/50 p-4 transition-colors hover:bg-muted/30 cursor-pointer">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-rose-500" />
                  <span className="text-sm font-medium text-foreground">SLA Response Time Breach Alert</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Triggers an immediate executive warning when a sales rep fails to respond within SLA threshold.
                </p>
              </div>
              <input
                type="checkbox"
                checked={rules.alert_sla_breach}
                onChange={(e) => setRules({ ...rules, alert_sla_breach: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </label>

            <label className="flex items-start justify-between rounded-lg border border-border/80 bg-background/50 p-4 transition-colors hover:bg-muted/30 cursor-pointer">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Unassigned Lead Warning</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Alerts the CEO when an inbound lead remains unassigned for more than 10 minutes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={rules.alert_unassigned_lead}
                onChange={(e) => setRules({ ...rules, alert_unassigned_lead: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </label>

            <label className="flex items-start justify-between rounded-lg border border-border/80 bg-background/50 p-4 transition-colors hover:bg-muted/30 cursor-pointer">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <WhatsAppChatsIcon className="size-4 text-red-500" />
                  <span className="text-sm font-medium text-foreground">Channel Disconnect / Webhook Drop</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Instant alert if any Meta WhatsApp channel loses connection or fails webhook delivery.
                </p>
              </div>
              <input
                type="checkbox"
                checked={rules.alert_channel_disconnect}
                onChange={(e) => setRules({ ...rules, alert_channel_disconnect: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </label>

            <label className="flex items-start justify-between rounded-lg border border-border/80 bg-background/50 p-4 transition-colors hover:bg-muted/30 cursor-pointer">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-blue-500" />
                  <span className="text-sm font-medium text-foreground">Daily Executive WhatsApp Digest</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sends an automated 6:00 PM summary of 14 KPIs and team performance to the CEO WhatsApp.
                </p>
              </div>
              <input
                type="checkbox"
                checked={rules.daily_executive_digest}
                onChange={(e) => setRules({ ...rules, daily_executive_digest: e.target.checked })}
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
            </label>
          </div>
        </div>

        {/* CEO Direct Contact Channels */}
        <div className="border-t border-border pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            CEO Alert Escalation Endpoints
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ceo-wa" className="flex items-center gap-1.5 text-xs font-medium">
                <WhatsAppChatsIcon className="size-3.5 text-primary" />
                CEO WhatsApp Phone Number
              </Label>
              <Input
                id="ceo-wa"
                value={rules.ceo_whatsapp_number}
                onChange={(e) => setRules({ ...rules, ceo_whatsapp_number: e.target.value })}
                placeholder="+92 300 1234567"
              />
              <p className="text-[11px] text-muted-foreground">Direct number for automated critical SLA escalations</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ceo-email" className="flex items-center gap-1.5 text-xs font-medium">
                <Mail className="size-3.5 text-primary" />
                CEO Alert Email
              </Label>
              <Input
                id="ceo-email"
                type="email"
                value={rules.ceo_alert_email}
                onChange={(e) => setRules({ ...rules, ceo_alert_email: e.target.value })}
                placeholder="ceo@fortline.com"
              />
              <p className="text-[11px] text-muted-foreground">Receives daily digests and system outage reports</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Alert Rules
          </Button>
        </div>
      </form>
    </div>
  )
}
