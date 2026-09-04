"use client"

import { useCallback, useEffect, useState } from 'react'
import {
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Building2,
} from 'lucide-react'
import Link from 'next/link'
import { FortlineKpiGrid } from '@/components/dashboard/fortline-kpi-grid'
import { SalesMembersTable } from '@/components/dashboard/sales-members-table'
import { ExceptionsCard } from '@/components/dashboard/exceptions-card'
import { ExecutiveActivityStream } from '@/components/dashboard/executive-activity-stream'
import type {
  FortlineDashboardResponse,
  FortlineDashboardKPIs,
} from '@/types/fortline'

const DEFAULT_KPIS: FortlineDashboardKPIs = {
  totalSalesMembers: 30,
  onlineSalesMembers: 0,
  awaySalesMembers: 0,
  offlineSalesMembers: 30,
  totalActiveChannels: 0,
  activeChannels: 0,
  newLeadsToday: 0,
  unansweredConversations: 0,
  overdueConversations: 0,
  avgFirstResponseTimeSeconds: 0,
  avgFirstResponseTimeMinutes: 0,
  messagesReceivedToday: 0,
  messagesSentToday: 0,
  pendingInternalWork: 0,
  slaBreaches: 0,
  openExceptions: 0,
}

export default function DashboardPage() {
  const [data, setData] = useState<FortlineDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('today')

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/fortline/dashboard/summary?range=${timeRange}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        console.error('[dashboard] Failed to load summary:', await res.text())
      }
    } catch (err) {
      console.error('[dashboard] Error fetching summary:', err)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-6 pb-12">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Fortline-Pvt Executive Operations
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            CEO Command Center: Centralized monitoring of 30 sales members, dedicated WhatsApp lines, and client SLA adherence.
          </p>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range selector */}
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === 'today'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === '7d'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                timeRange === '30d'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              30 Days
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchSummary()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/inbox"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs"
          >
            <MessageSquare className="size-3.5" />
            <span>Open CEO Inbox</span>
          </Link>
        </div>
      </div>

      {/* 14 Executive KPI Cards Grid */}
      <FortlineKpiGrid
        kpis={data?.kpis || DEFAULT_KPIS}
        loading={loading && !data}
      />

      {/* Actionable Exceptions and Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ExceptionsCard
          exceptions={data?.exceptions || []}
          loading={loading && !data}
        />
        <ExecutiveActivityStream
          activity={data?.recentActivity || []}
          loading={loading && !data}
        />
      </div>

      {/* 30 Sales Members Monitoring Table */}
      <SalesMembersTable
        salesMembers={data?.salesMembers || []}
        divisions={
          data?.divisions || [
            'Enterprise Servers',
            'Laptops & Fleet',
            'Hardware & Components',
            'Data Center Services',
            'IT Managed Services',
          ]
        }
        onRefresh={fetchSummary}
      />
    </div>
  )
}
