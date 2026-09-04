"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  Pencil,
  Check,
  X,
  Loader2,
  RefreshCw,
  Power,
  ShieldCheck,
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
import type { FortlineSalesMemberWithPresence } from '@/types/fortline'

export function FortlineSalesMembersSettings() {
  const [members, setMembers] = useState<FortlineSalesMemberWithPresence[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingMember, setEditingMember] = useState<FortlineSalesMemberWithPresence | null>(null)
  const [saving, setSaving] = useState(false)

  // Edit form fields
  const [name, setName] = useState('')
  const [division, setDivision] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [isActive, setIsActive] = useState(true)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/fortline/sales-members')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.salesMembers || [])
      } else {
        toast.error('Failed to load sales members')
      }
    } catch {
      toast.error('Network error loading sales members')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const openEdit = (m: FortlineSalesMemberWithPresence) => {
    setEditingMember(m)
    setName(m.name)
    setDivision(m.division)
    setPhone(m.whatsapp_phone_number || m.phone_number || '')
    setPhoneId(m.whatsapp_phone_number_id || m.channel_id || '')
    setIsActive(m.is_active)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    setSaving(true)
    try {
      const res = await fetch(`/api/fortline/sales-members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          division: division.trim(),
          whatsapp_phone_number: phone.trim() || null,
          whatsapp_phone_number_id: phoneId.trim() || null,
          is_active: isActive,
        }),
      })

      if (res.ok) {
        toast.success(`Updated ${name}`)
        setEditingMember(null)
        fetchMembers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update sales rep')
      }
    } catch {
      toast.error('Network error saving sales rep')
    } finally {
      setSaving(false)
    }
  }

  const toggleActiveQuick = async (m: FortlineSalesMemberWithPresence) => {
    try {
      const res = await fetch(`/api/fortline/sales-members/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !m.is_active,
        }),
      })
      if (res.ok) {
        toast.success(`${m.name} is now ${!m.is_active ? 'active' : 'inactive'}`)
        fetchMembers()
      }
    } catch {
      toast.error('Failed to toggle active state')
    }
  }

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.member_code ? m.member_code.toLowerCase().includes(search.toLowerCase()) : false) ||
      m.division.toLowerCase().includes(search.toLowerCase()) ||
      ((m.whatsapp_phone_number || m.phone_number) ? (m.whatsapp_phone_number || m.phone_number).includes(search) : false)
  )

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-primary/10 text-primary">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Sales Members Roster ({members.length} Reps)
            </h2>
            <p className="text-xs text-muted-foreground">
              Operational sales representatives assigned to dedicated WhatsApp channels. Reps are operational records, not login users.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMembers}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Rep Code & Name</th>
              <th className="py-2.5 px-3">Division</th>
              <th className="py-2.5 px-3">WhatsApp Number</th>
              <th className="py-2.5 px-3">Phone Number ID</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  No sales reps found matching search.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <span>{m.name}</span>
                      <span className="text-[10px] font-mono font-normal px-1 py-0.2 rounded bg-muted text-muted-foreground">
                        {m.member_code || m.id.slice(0, 6)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{m.email || m.phone_number}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex px-2 py-0.5 rounded bg-muted text-[11px] font-medium border border-border/60">
                      {m.division}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    {m.whatsapp_phone_number || m.phone_number || <span className="text-muted-foreground">Not set</span>}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground">
                    {m.whatsapp_phone_number_id || m.channel_id || '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => toggleActiveQuick(m)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                        m.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      <Power className="size-2.5" />
                      <span>{m.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(m)}
                      className="h-7 px-2 text-xs"
                    >
                      <Pencil className="size-3 mr-1" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sales Rep ({editingMember?.member_code})</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Rep Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Division</Label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Enterprise Servers">Enterprise Servers</option>
                <option value="Laptops & Fleet">Laptops & Fleet</option>
                <option value="Hardware & Components">Hardware & Components</option>
                <option value="Data Center Services">Data Center Services</option>
                <option value="IT Managed Services">IT Managed Services</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">WhatsApp Phone Number</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+923001234567"
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">WhatsApp Phone Number ID (Meta Graph ID)</Label>
              <Input
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="100000000000001"
                className="bg-muted border-border"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active_cb"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="is_active_cb" className="text-xs font-medium cursor-pointer">
                Active in round-robin and channel assignment
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMember(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
