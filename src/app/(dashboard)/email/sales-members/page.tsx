'use client'

import { useEffect, useState } from 'react'
import {
  UsersRound,
  Mail,
  Clock,
  AlertTriangle,
  ArrowUpDown,
  Search,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RepAnalytics {
  id: string
  name: string
  division: string
  designation: string
  email_address: string
  connection_status: string
  sync_status: string
  last_sync_at: string | null
  totalThreads: number
  openThreads: number
  overdueThreads: number
  waitingForRep: number
  avgResponseMinutes: number | null
  sentCount: number
  receivedCount: number
  lastActivityAt: string | null
}

export default function SalesMembersEmailPage() {
  const [analytics, setAnalytics] = useState<RepAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<keyof RepAnalytics>('overdueThreads')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    fetch('/api/email/analytics')
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data.analytics || [])
      })
      .catch(() => {
        toast.error('Failed to load sales member analytics')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = analytics.filter(
    (rep) =>
      rep.name.toLowerCase().includes(search.toLowerCase()) ||
      rep.division.toLowerCase().includes(search.toLowerCase()) ||
      (rep.email_address && rep.email_address.toLowerCase().includes(search.toLowerCase())),
  )

  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField]
    const valB = b[sortField]
    if (valA === null || valA === undefined) return 1
    if (valB === null || valB === undefined) return -1
    if (valA < valB) return sortAsc ? -1 : 1
    if (valA > valB) return sortAsc ? 1 : -1
    return 0
  })

  const handleSort = (field: keyof RepAnalytics) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-600/10 text-[#2B60DE] border border-blue-600/20">
              <UsersRound className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Sales Member Email Accountability
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Executive visibility into 30 sales members&apos; email correspondence, response times, and SLA adherence.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search member, division, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Analytics Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border select-none">
              <tr>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Sales Member
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5">Mailbox</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('totalThreads')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Threads
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('waitingForRep')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Needs Reply
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('overdueThreads')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Overdue SLA
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5">
                  <button
                    type="button"
                    onClick={() => handleSort('avgResponseMinutes')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Avg Response
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-3.5">Sent / Received</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="p-4 bg-muted/20" />
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No sales members match your search criteria.
                  </td>
                </tr>
              ) : (
                sorted.map((rep) => {
                  const isConnected = rep.connection_status === 'connected'
                  return (
                    <tr key={rep.id} className="hover:bg-muted/10 transition-colors">
                      {/* Name & Designation */}
                      <td className="p-3.5 font-medium">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-foreground text-xs">
                            {rep.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {rep.division} &bull; {rep.designation}
                          </span>
                        </div>
                      </td>

                      {/* Mailbox */}
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                        {rep.email_address}
                      </td>

                      {/* Connection */}
                      <td className="p-3.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            isConnected
                              ? 'bg-blue-600/15 text-[#2B60DE] dark:text-[#2B60DE] border border-blue-600/30'
                              : 'bg-muted text-muted-foreground border border-border',
                          )}
                        >
                          {isConnected ? (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          ) : (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          )}
                          {rep.connection_status}
                        </span>
                      </td>

                      {/* Threads */}
                      <td className="p-3.5 font-semibold text-foreground">
                        {rep.totalThreads}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          ({rep.openThreads} open)
                        </span>
                      </td>

                      {/* Needs Reply */}
                      <td className="p-3.5">
                        {rep.waitingForRep > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            {rep.waitingForRep}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      {/* Overdue */}
                      <td className="p-3.5">
                        {rep.overdueThreads > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-600/15 text-[#2B60DE] border border-blue-600/30">
                            <AlertTriangle className="w-3 h-3" />
                            {rep.overdueThreads}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>

                      {/* Avg Response */}
                      <td className="p-3.5 font-medium">
                        {rep.avgResponseMinutes !== null ? (
                          <span>{rep.avgResponseMinutes} min</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>

                      {/* Sent / Received */}
                      <td className="p-3.5 text-muted-foreground">
                        <span className="font-semibold text-foreground">{rep.sentCount}</span> sent /{' '}
                        <span>{rep.receivedCount} rec</span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/email/sales-members/${rep.id}`}
                            className="text-primary hover:underline font-semibold"
                          >
                            Details
                          </Link>
                          <span className="text-muted-foreground/40">&bull;</span>
                          <Link
                            href={`/email/inbox?sales_rep_id=${rep.id}`}
                            className="text-muted-foreground hover:text-foreground font-medium"
                          >
                            Inbox &rarr;
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
      </div>
    </div>
  )
}
