"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  MessageSquare,
  Clock,
  Wifi,
  UserX,
  ShieldAlert,
  ChevronDown,
  QrCode,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FortlineSalesMemberWithPresence } from '@/types/fortline'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { SalesChannelQrDialog } from '@/components/settings/sales-channel-qr-dialog'
import { WhatsAppChatsIcon } from '@/components/icons/whatsapp-business-logo'

interface SalesMembersTableProps {
  salesMembers: FortlineSalesMemberWithPresence[]
  divisions: string[]
  onRefresh?: () => void
}

export function SalesMembersTable({
  salesMembers,
  divisions,
  onRefresh,
}: SalesMembersTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [selectedPresence, setSelectedPresence] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'division' | 'presence' | 'response_time' | 'contacts'>('division')
  const [sortAsc, setSortAsc] = useState(true)
  const [qrMember, setQrMember] = useState<FortlineSalesMemberWithPresence | null>(null)

  const filteredMembers = useMemo(() => {
    return salesMembers.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.member_code ? member.member_code.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
        ((member.whatsapp_phone_number || member.phone_number) ? (member.whatsapp_phone_number || member.phone_number).includes(searchTerm) : false) ||
        (member.division ? member.division.toLowerCase().includes(searchTerm.toLowerCase()) : false)

      const matchesDivision =
        selectedDivision === 'all' || member.division === selectedDivision

      const matchesPresence =
        selectedPresence === 'all' || member.presence_status === selectedPresence

      return matchesSearch && matchesDivision && matchesPresence
    }).sort((a, b) => {
      let comparison = 0
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === 'division') {
        comparison = a.division.localeCompare(b.division)
      } else if (sortField === 'presence') {
        const order: Record<string, number> = { online: 1, away: 2, offline: 3, unknown: 4 }
        comparison = (order[a.presence_status] || 5) - (order[b.presence_status] || 5)
      } else if (sortField === 'response_time') {
        comparison = (a.avg_response_time_seconds || 99999) - (b.avg_response_time_seconds || 99999)
      } else if (sortField === 'contacts') {
        const countA = a.assigned_contact_count ?? a.assigned_contacts_count ?? 0
        const countB = b.assigned_contact_count ?? b.assigned_contacts_count ?? 0
        comparison = countA - countB
      }
      return sortAsc ? comparison : -comparison
    })
  }, [salesMembers, searchTerm, selectedDivision, selectedPresence, sortField, sortAsc])

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const formatActivityTime = (isoString?: string | null) => {
    if (!isoString) return 'Never'
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Sales Force Monitoring ({filteredMembers.length} of {salesMembers.length})
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              30 Dedicated Channels
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time activity, presence signals, and conversation assignment for all sales members
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search rep, code, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="relative">
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All Divisions</option>
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-3 size-3 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedPresence}
              onChange={(e) => setSelectedPresence(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="online">Online</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 size-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-medium uppercase tracking-wider">
            <tr>
              <th
                onClick={() => toggleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Sales Member</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('division')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Division</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th className="py-3 px-4">WhatsApp Channel</th>
              <th
                onClick={() => toggleSort('presence')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Presence</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th className="py-3 px-4">Last Activity</th>
              <th
                onClick={() => toggleSort('contacts')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Assigned Leads</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('response_time')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Avg Response</span>
                  <ArrowUpDown className="size-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No sales members match the selected filters.
                </td>
              </tr>
            ) : (
              filteredMembers.map((rep) => {
                const isOnline = rep.presence_status === 'online'
                const isAway = rep.presence_status === 'away'
                const isOffline = rep.presence_status === 'offline'

                return (
                  <tr
                    key={rep.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Member */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {rep.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              'absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card',
                              isOnline && 'bg-emerald-500',
                              isAway && 'bg-amber-500',
                              isOffline && 'bg-slate-400'
                            )}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{rep.name}</span>
                            <span className="text-[10px] font-mono font-normal text-muted-foreground px-1 py-0.5 rounded bg-muted">
                              {rep.member_code || rep.id.slice(0, 6)}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                            {rep.email || rep.phone_number}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Division */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-foreground border border-border/60">
                        {rep.division}
                      </span>
                    </td>

                    {/* WhatsApp Channel */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-foreground">
                        {rep.whatsapp_phone_number || rep.phone_number || 'Unlinked'}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        ID: {rep.whatsapp_phone_number_id ? rep.whatsapp_phone_number_id.slice(-6) : (rep.channel_id ? rep.channel_id.slice(-6) : 'None')}
                      </span>
                    </td>

                    {/* Presence */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {/* Primary presence status */}
                        <div className="flex items-center gap-1">
                          {isOnline && (
                            <span
                              title="Sent or received a WhatsApp message in the last 30 minutes"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-help"
                            >
                              <Wifi className="size-3" /> Online
                            </span>
                          )}
                          {isAway && (
                            <span
                              title="WhatsApp session is active but no message in 30–120 min. Rep is at desk but quiet."
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-help"
                            >
                              <Clock className="size-3" /> Away
                            </span>
                          )}
                          {isOffline && (
                            <span
                              title="WhatsApp channel is disconnected or inactive for over 2 hours"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border cursor-help"
                            >
                              <UserX className="size-3" /> Offline
                            </span>
                          )}
                        </div>
                        {/* Gateway session sub-badge */}
                        {rep.channel_connection_status === 'disconnected' && (
                          <span className="text-[9px] text-rose-500 font-medium">⚠ Session disconnected</span>
                        )}
                        {rep.channel_connection_status === 'connected' && isOffline && (
                          <span className="text-[9px] text-amber-500 font-medium">Session alive, inactive</span>
                        )}
                      </div>
                    </td>

                    {/* Last Activity */}
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      <div>{formatActivityTime(rep.last_activity_at)}</div>
                      {rep.last_outbound_at && (
                        <div className="text-[10px] text-muted-foreground/80">
                          Out: {formatActivityTime(rep.last_outbound_at)}
                        </div>
                      )}
                      {rep.last_inbound_at && (
                        <div className="text-[10px] text-muted-foreground/80">
                          In: {formatActivityTime(rep.last_inbound_at)}
                        </div>
                      )}
                    </td>


                    {/* Assigned Leads */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground tabular-nums">
                        {rep.assigned_contact_count ?? rep.assigned_contacts_count ?? 0}
                      </span>
                    </td>

                    {/* Avg Response Time */}
                    <td className="py-3 px-4">
                      {rep.avg_response_time_seconds ? (
                        <span
                          className={cn(
                            'font-medium tabular-nums',
                            rep.avg_response_time_seconds > 900
                              ? 'text-rose-500 font-semibold'
                              : 'text-foreground'
                          )}
                        >
                          {Math.round(rep.avg_response_time_seconds / 60)} min
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQrMember(rep)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground text-[11px] font-medium transition-colors border border-border"
                          title="Scan WhatsApp QR code to link mobile phone"
                        >
                          <QrCode className="size-3 text-primary" />
                          <span>QR Link</span>
                        </button>
                        <Link
                          href={`/inbox?sales_member_id=${rep.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-medium transition-colors"
                          title="Open WhatsApp conversations for this rep"
                        >
                          <WhatsAppChatsIcon className="size-3" />
                          <span>Inbox</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* QR Code Linking Dialog */}
      <SalesChannelQrDialog
        member={qrMember}
        open={!!qrMember}
        onOpenChange={(open) => !open && setQrMember(null)}
        onStatusChanged={onRefresh}
      />
    </div>
  )
}
