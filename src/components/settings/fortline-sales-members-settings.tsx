"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  RefreshCw,
  Power,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Phone,
  QrCode,
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
  DialogDescription,
} from '@/components/ui/dialog'
import { SalesChannelQrDialog } from '@/components/settings/sales-channel-qr-dialog'
import type { FortlineSalesMember } from '@/types/fortline'

const DEFAULT_DIVISIONS = [
  'Enterprise Servers',
  'Laptops & Corporate Fleet',
  'PCs & Hardware Components',
  'Data Center Infrastructure',
  'IT Managed & Cloud Services',
]

export function FortlineSalesMembersSettings() {
  const [members, setMembers] = useState<FortlineSalesMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Edit / Add / QR state
  const [editingMember, setEditingMember] = useState<FortlineSalesMember | null>(null)
  const [qrMember, setQrMember] = useState<FortlineSalesMember | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [deletingMember, setDeletingMember] = useState<FortlineSalesMember | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formDivision, setFormDivision] = useState(DEFAULT_DIVISIONS[0])
  const [formDesignation, setFormDesignation] = useState('Sales Representative')
  const [formIsActive, setFormIsActive] = useState(true)

  // Bulk import state
  const [bulkText, setBulkText] = useState('')
  const [clearExistingOnBulk, setClearExistingOnBulk] = useState(true)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/fortline/sales-members?limit=100')
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || data.salesMembers || [])
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

  const openAdd = () => {
    setFormName('')
    setFormPhone('')
    setFormDivision(DEFAULT_DIVISIONS[0])
    setFormDesignation('Sales Representative')
    setFormIsActive(true)
    setIsAddOpen(true)
  }

  const openEdit = (m: FortlineSalesMember) => {
    setEditingMember(m)
    setFormName(m.name)
    setFormPhone(m.phone_number || '')
    setFormDivision(m.division || DEFAULT_DIVISIONS[0])
    setFormDesignation(m.designation || 'Sales Representative')
    setFormIsActive(m.is_active)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and Phone Number are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/fortline/sales-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone_number: formPhone.trim(),
          division: formDivision.trim(),
          designation: formDesignation.trim(),
          is_active: formIsActive,
        }),
      })

      if (res.ok) {
        toast.success(`Added ${formName} to sales roster`)
        setIsAddOpen(false)
        fetchMembers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to add sales member')
      }
    } catch {
      toast.error('Network error creating sales member')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    setSaving(true)
    try {
      const res = await fetch(`/api/fortline/sales-members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone_number: formPhone.trim(),
          division: formDivision.trim(),
          designation: formDesignation.trim(),
          is_active: formIsActive,
        }),
      })

      if (res.ok) {
        toast.success(`Updated ${formName}`)
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

  const handleDelete = async () => {
    if (!deletingMember) return
    setSaving(true)
    try {
      const res = await fetch(`/api/fortline/sales-members/${deletingMember.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(`Removed ${deletingMember.name}`)
        setDeletingMember(null)
        fetchMembers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete sales rep')
      }
    } catch {
      toast.error('Network error deleting sales rep')
    } finally {
      setSaving(false)
    }
  }

  const toggleActiveQuick = async (m: FortlineSalesMember) => {
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

  // Parse bulk lines: "Name, Phone, Division, Designation" or JSON
  const parseBulkEntries = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return []

    // Check if JSON
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            name: item.name || '',
            phone_number: item.phone_number || item.phone || '',
            division: item.division || 'General Sales',
            designation: item.designation || 'Sales Representative',
          })).filter((x) => x.name && x.phone_number)
        }
      } catch {
        // Fallback to line parsing
      }
    }

    // Line by line parsing
    const lines = trimmed.split('\n')
    const results = []
    for (const line of lines) {
      const cleanLine = line.trim()
      if (!cleanLine || cleanLine.startsWith('#')) continue

      // Delimiter: tab or comma
      const parts = cleanLine.includes('\t')
        ? cleanLine.split('\t')
        : cleanLine.split(',')

      if (parts.length >= 2) {
        const name = parts[0].trim()
        const phone = parts[1].trim()
        const division = parts[2]?.trim() || 'General Sales'
        const designation = parts[3]?.trim() || 'Sales Representative'
        if (name && phone) {
          results.push({ name, phone_number: phone, division, designation })
        }
      }
    }
    return results
  }

  const parsedBulk = parseBulkEntries(bulkText)

  const handleBulkSubmit = async () => {
    if (parsedBulk.length === 0) {
      toast.error('No valid staff rows found. Format: Name, Phone Number, Division')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/fortline/sales-members/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearExisting: clearExistingOnBulk,
          members: parsedBulk,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Successfully saved ${data.count} staff members!`)
        setIsBulkOpen(false)
        setBulkText('')
        fetchMembers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to replace staff roster')
      }
    } catch {
      toast.error('Network error during bulk replacement')
    } finally {
      setSaving(false)
    }
  }

  const handleWipeAllDummy = async () => {
    if (!confirm('Are you sure you want to remove ALL current dummy sales members? You can re-add your real staff afterwards.')) {
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/fortline/sales-members/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clearExisting: true,
          members: [],
        }),
      })

      if (res.ok) {
        toast.success('Cleared all dummy sales members')
        setIsBulkOpen(false)
        fetchMembers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to clear members')
      }
    } catch {
      toast.error('Network error clearing dummy members')
    } finally {
      setSaving(false)
    }
  }

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.phone_number ? m.phone_number.includes(search) : false) ||
      (m.division ? m.division.toLowerCase().includes(search.toLowerCase()) : false) ||
      (m.designation ? m.designation.toLowerCase().includes(search.toLowerCase()) : false)
  )

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span>Sales Members Roster</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-normal text-muted-foreground">
                {members.length} {members.length === 1 ? 'Rep' : 'Reps'}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sales team monitored by the CEO. Add your real staff names and phone numbers here.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMembers}
            disabled={loading}
            className="h-9"
            title="Refresh Roster"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <UploadCloud className="size-3.5" />
            <span>Bulk Replace / Clear</span>
          </Button>

          <Button
            size="sm"
            onClick={openAdd}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span>Add Member</span>
          </Button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
            <tr>
              <th className="py-3 px-3">Staff Name & Designation</th>
              <th className="py-3 px-3">Division</th>
              <th className="py-3 px-3">WhatsApp Number</th>
              <th className="py-3 px-3">Channel / Gateway ID</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto text-primary mb-2" />
                  <span>Loading sales roster...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  {members.length === 0 ? (
                    <div className="space-y-3 max-w-sm mx-auto">
                      <p className="font-medium text-foreground">No staff members in the roster yet.</p>
                      <p className="text-xs">Click "Add Member" or "Bulk Replace" to add your real staff names and phone numbers.</p>
                      <Button size="sm" onClick={openAdd} className="gap-1.5">
                        <Plus className="size-3.5" /> Add First Member
                      </Button>
                    </div>
                  ) : (
                    'No staff members matching your search.'
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-foreground">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground">{m.designation || 'Sales Representative'}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex px-2 py-0.5 rounded bg-muted text-[11px] font-medium border border-border/60">
                      {m.division || 'General Sales'}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3 text-emerald-500" />
                      <span>{m.phone_number || 'No number'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] text-muted-foreground">
                    {m.channel_id || '—'}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => toggleActiveQuick(m)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                        m.is_active
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      <Power className="size-2.5" />
                      <span>{m.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQrMember(m)}
                        className="h-7 px-2 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                        title="Scan QR Code to link WhatsApp"
                      >
                        <QrCode className="size-3" />
                        <span>Link Phone</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(m)}
                        className="h-7 px-2 text-xs"
                      >
                        <Pencil className="size-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingMember(m)}
                        className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      <Dialog open={isAddOpen} onOpenChange={(open) => !open && setIsAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Sales Member</DialogTitle>
            <DialogDescription>
              Add a real staff member to be monitored in the Executive CRM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Staff Full Name *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Ali Ahmed"
                required
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Phone Number *</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+923001234567"
                required
                className="bg-muted border-border font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Include country code (e.g. +92 for Pakistan).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Division</Label>
              <select
                value={formDivision}
                onChange={(e) => setFormDivision(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-muted px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DEFAULT_DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Designation / Role</Label>
              <Input
                value={formDesignation}
                onChange={(e) => setFormDesignation(e.target.value)}
                placeholder="e.g. Senior Server Specialist"
                className="bg-muted border-border"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="form_active_cb"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="form_active_cb" className="text-xs font-medium cursor-pointer">
                Active in round-robin and monitoring
              </Label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Sales Member</DialogTitle>
            <DialogDescription>
              Update staff information for {editingMember?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Staff Full Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">WhatsApp Phone Number</Label>
              <Input
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                required
                placeholder="+923001234567"
                className="bg-muted border-border font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Division</Label>
              <select
                value={formDivision}
                onChange={(e) => setFormDivision(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-muted px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {DEFAULT_DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Designation / Role</Label>
              <Input
                value={formDesignation}
                onChange={(e) => setFormDesignation(e.target.value)}
                className="bg-muted border-border"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit_active_cb"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="edit_active_cb" className="text-xs font-medium cursor-pointer">
                Active in round-robin and monitoring
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

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <AlertCircle className="size-5" />
              <span>Delete Sales Member</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deletingMember?.name}</strong> ({deletingMember?.phone_number}) from the roster?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingMember(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Delete Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Replace / Import Modal */}
      <Dialog open={isBulkOpen} onOpenChange={(open) => !open && setIsBulkOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bulk Replace / Import Staff Roster</DialogTitle>
            <DialogDescription>
              Paste your list of real staff members below to replace the random 30 dummy members all at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-muted/60 border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground">Paste format (one per line):</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                Full Name, Phone Number, Division, Designation
              </p>
              <p className="text-muted-foreground mt-1">
                Example:<br />
                <span className="font-mono">Tariq Jamil, +923001234567, Enterprise Servers, Lead Specialist</span><br />
                <span className="font-mono">Hamza Khan, +923217654321, Laptops & Fleet, Account Manager</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Paste Staff List</Label>
              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Ali Ahmed, +923001112233, Enterprise Servers\nBilal Khan, +923004445566, Laptops & Corporate Fleet`}
                className="w-full rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="clear_existing_cb"
                  checked={clearExistingOnBulk}
                  onChange={(e) => setClearExistingOnBulk(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <Label htmlFor="clear_existing_cb" className="cursor-pointer font-medium">
                  Wipe old/dummy members before importing
                </Label>
              </div>

              <div className="font-semibold text-primary">
                {parsedBulk.length > 0 ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    {parsedBulk.length} valid rows parsed
                  </span>
                ) : (
                  <span className="text-muted-foreground">0 rows detected</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleWipeAllDummy}
                disabled={saving || members.length === 0}
                className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              >
                Clear All 30 Dummy Records Only
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkSubmit}
                  disabled={saving || parsedBulk.length === 0}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : `Apply ${parsedBulk.length} Members`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Linking Dialog */}
      <SalesChannelQrDialog
        member={qrMember}
        open={!!qrMember}
        onOpenChange={(open) => !open && setQrMember(null)}
        onStatusChanged={fetchMembers}
      />
    </div>
  )
}
