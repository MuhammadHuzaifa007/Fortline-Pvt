'use client'

import { Search, Filter, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface EmailFiltersProps {
  search: string
  onSearchChange: (search: string) => void
  status: string
  onStatusChange: (status: string) => void
  waitingFor: string
  onWaitingForChange: (waitingFor: string) => void
  isOverdueOnly: boolean
  onToggleOverdue: () => void
  salesRepId: string
  onSalesRepChange: (repId: string) => void
  salesMembers: Array<{ id: string; name: string }>
}

export function EmailFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  waitingFor,
  onWaitingForChange,
  isOverdueOnly,
  onToggleOverdue,
  salesRepId,
  onSalesRepChange,
  salesMembers,
}: EmailFiltersProps) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-card border-b border-border">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search subjects, clients, or emails..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-xs bg-background"
        />
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sales Rep Selector */}
        <select
          value={salesRepId}
          onChange={(e) => onSalesRepChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#2B60DE]"
        >
          <option value="">All Sales Members ({salesMembers.length})</option>
          {salesMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#2B60DE]"
        >
          <option value="">All Statuses</option>
          <option value="open">Open Threads</option>
          <option value="closed">Closed Threads</option>
        </select>

        {/* Waiting State */}
        <select
          value={waitingFor}
          onChange={(e) => onWaitingForChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#2B60DE]"
        >
          <option value="">All Waiting States</option>
          <option value="employee">Waiting for Rep</option>
          <option value="client">Waiting for Client</option>
        </select>

        {/* Overdue Pill */}
        <Button
          type="button"
          variant={isOverdueOnly ? 'destructive' : 'outline'}
          size="sm"
          onClick={onToggleOverdue}
          className="h-8 text-xs gap-1.5 px-2.5"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Overdue Only
        </Button>
      </div>
    </div>
  )
}
