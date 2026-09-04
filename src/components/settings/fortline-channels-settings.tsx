"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Radio,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Pencil,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { FortlineWhatsAppChannel, FortlineSalesMember } from '@/types/fortline'
import { formatDistanceToNow } from 'date-fns'

export function FortlineChannelsSettings() {
  const [channels, setChannels] = useState<FortlineWhatsAppChannel[]>([])
  const [salesMembers, setSalesMembers] = useState<FortlineSalesMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingChannel, setEditingChannel] = useState<FortlineWhatsAppChannel | null>(null)
  const [assignedRepId, setAssignedRepId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [chanRes, repRes] = await Promise.all([
        fetch('/api/fortline/channels'),
        fetch('/api/fortline/sales-members'),
      ])

      if (chanRes.ok) {
        const d = await chanRes.json()
        setChannels(d.channels || [])
      }
      if (repRes.ok) {
        const d = await repRes.json()
        setSalesMembers(d.salesMembers || [])
      }
    } catch {
      toast.error('Network error loading channels')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openEdit = (c: FortlineWhatsAppChannel) => {
    setEditingChannel(c)
    setAssignedRepId(c.sales_member_id || '')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingChannel) return
    setSaving(true)
    try {
      const res = await fetch(`/api/fortline/channels/${editingChannel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member_id: assignedRepId || null,
        }),
      })

      if (res.ok) {
        toast.success(`Channel ${editingChannel.channel_name || editingChannel.display_phone_number || editingChannel.phone_number_id} updated`)
        setEditingChannel(null)
        fetchData()
      } else {
        toast.error('Failed to update channel assignment')
      }
    } catch {
      toast.error('Network error saving channel')
    } finally {
      setSaving(false)
    }
  }

  const filtered = channels.filter(
    (c) =>
      (c.channel_name ? c.channel_name.toLowerCase().includes(search.toLowerCase()) : false) ||
      (c.display_phone_number ? c.display_phone_number.includes(search) : false) ||
      c.phone_number_id.includes(search) ||
      (c.sales_member_name ? c.sales_member_name.toLowerCase().includes(search.toLowerCase()) : (c.sales_member?.name ? c.sales_member.name.toLowerCase().includes(search.toLowerCase()) : false))
  )

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-primary/10 text-primary">
            <Radio className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              WhatsApp Multi-Channel Manager ({channels.length} Lines)
            </h2>
            <p className="text-xs text-muted-foreground">
              Multi-number routing topology: phone_number_id → sales member → contact → conversation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search lines or reps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Channel Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Channel Name</th>
              <th className="py-2.5 px-3">Phone Number</th>
              <th className="py-2.5 px-3">Phone Number ID</th>
              <th className="py-2.5 px-3">Assigned Sales Rep</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Last Health Event</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No WhatsApp channels found.
                </td>
              </tr>
            ) : (
              filtered.map((chan) => {
                const isConnected = chan.connection_status === 'connected'
                const lastEvent = chan.last_successful_event_at
                  ? (() => {
                      try {
                        return formatDistanceToNow(new Date(chan.last_successful_event_at), {
                          addSuffix: true,
                        })
                      } catch {
                        return 'unknown'
                      }
                    })()
                  : 'Never'

                return (
                  <tr key={chan.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {chan.channel_name || chan.display_phone_number || 'Channel'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {chan.phone_number || chan.display_phone_number || chan.phone_number_id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground">
                      {chan.phone_number_id}
                    </td>
                    <td className="py-2.5 px-3">
                      {(chan.sales_member_name || chan.sales_member?.name) ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary">
                            {chan.sales_member_name || chan.sales_member?.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({chan.sales_member_division || chan.sales_member?.division})
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-medium border border-amber-500/20">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isConnected
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isConnected ? <Wifi className="size-2.5" /> : <WifiOff className="size-2.5" />}
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                      {lastEvent}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(chan)}
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="size-3 mr-1" />
                        Reassign
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reassign Modal */}
      <Dialog open={!!editingChannel} onOpenChange={(open) => !open && setEditingChannel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign WhatsApp Line ({editingChannel?.channel_name || editingChannel?.display_phone_number || editingChannel?.phone_number_id})</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              <p className="font-mono text-xs font-semibold">{editingChannel?.phone_number || editingChannel?.display_phone_number}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Phone Number ID</Label>
              <p className="font-mono text-xs text-muted-foreground">{editingChannel?.phone_number_id}</p>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Assigned Sales Member</Label>
              <select
                value={assignedRepId}
                onChange={(e) => setAssignedRepId(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                {salesMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.division} {m.member_code ? `- ${m.member_code}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingChannel(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save Assignment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
