'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { EmailThread, EmailAccount } from '@/types/email'
import { EmailFilters } from '@/components/email/email-filters'
import { EmailThreadList } from '@/components/email/email-thread-list'
import { EmailThreadView } from '@/components/email/email-thread-view'
import { EmailComposer } from '@/components/email/email-composer'
import { Mail, Send, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function EmailInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ account_id?: string; sales_rep_id?: string; thread_id?: string }>
}) {
  const resolvedParams = searchParams ? use(searchParams) : {}
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [salesMembers, setSalesMembers] = useState<Array<{ id: string; name: string }>>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    resolvedParams.thread_id || null,
  )
  const [activeThread, setActiveThread] = useState<EmailThread | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingActiveThread, setLoadingActiveThread] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [waitingFor, setWaitingFor] = useState('')
  const [isOverdueOnly, setIsOverdueOnly] = useState(false)
  const [salesRepId, setSalesRepId] = useState(resolvedParams.sales_rep_id || '')
  const [accountId, setAccountId] = useState(resolvedParams.account_id || '')

  // Load Accounts & Sales Members
  useEffect(() => {
    fetch('/api/email/accounts')
      .then((res) => res.json())
      .then((data) => {
        const accs: EmailAccount[] = data.accounts || []
        setAccounts(accs)
        const reps = accs
          .filter((a) => a.sales_member)
          .map((a) => ({ id: a.sales_rep_id, name: a.sales_member!.name }))
        setSalesMembers(reps)
      })
      .catch(() => {})
  }, [])

  // Load Threads list
  const loadThreads = useCallback(async () => {
    setLoadingThreads(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (waitingFor) params.set('waiting_for', waitingFor)
      if (isOverdueOnly) params.set('is_overdue', 'true')
      if (salesRepId) params.set('sales_rep_id', salesRepId)
      if (accountId) params.set('account_id', accountId)

      const res = await fetch(`/api/email/threads?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setThreads(json.threads || [])

        // If no thread selected yet, select first
        if (!selectedThreadId && json.threads?.length > 0) {
          setSelectedThreadId(json.threads[0].id)
        }
      }
    } catch {
      toast.error('Failed to load email threads')
    } finally {
      setLoadingThreads(false)
    }
  }, [search, status, waitingFor, isOverdueOnly, salesRepId, accountId, selectedThreadId])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Load Active Thread detail
  const loadActiveThread = useCallback(async (id: string) => {
    setLoadingActiveThread(true)
    try {
      const res = await fetch(`/api/email/threads/${id}`)
      if (res.ok) {
        const json = await res.json()
        setActiveThread(json.thread)
      }
    } catch {
      toast.error('Failed to load thread details')
    } finally {
      setLoadingActiveThread(false)
    }
  }, [])

  useEffect(() => {
    if (selectedThreadId) {
      loadActiveThread(selectedThreadId)
    } else {
      setActiveThread(null)
    }
  }, [selectedThreadId, loadActiveThread])

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">
            Microsoft 365 Shared Sales Inbox
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            ({threads.length} threads)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadThreads}
            className="h-8 text-xs gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setComposerOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 bg-[#0078D4] hover:bg-[#0078D4]/90 text-white"
          >
            <Send className="w-3.5 h-3.5" />
            Compose Email
          </Button>
        </div>
      </div>

      {/* 2 / 3 Column Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Thread List with Filters */}
        <div className="w-full sm:w-80 md:w-96 flex flex-col border-r border-border shrink-0 h-full overflow-hidden">
          <EmailFilters
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
            waitingFor={waitingFor}
            onWaitingForChange={setWaitingFor}
            isOverdueOnly={isOverdueOnly}
            onToggleOverdue={() => setIsOverdueOnly(!isOverdueOnly)}
            salesRepId={salesRepId}
            onSalesRepChange={setSalesRepId}
            salesMembers={salesMembers}
          />

          <EmailThreadList
            threads={threads}
            selectedThreadId={selectedThreadId}
            onSelectThread={(id) => setSelectedThreadId(id)}
            loading={loadingThreads}
          />
        </div>

        {/* Center / Right Column: Selected Thread View */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <EmailThreadView
            thread={activeThread}
            accounts={accounts}
            onThreadUpdated={() => {
              if (selectedThreadId) loadActiveThread(selectedThreadId)
              loadThreads()
            }}
          />
        </div>
      </div>

      {/* Global Email Composer Modal */}
      {composerOpen && (
        <EmailComposer
          accounts={accounts}
          onClose={() => setComposerOpen(false)}
          onSuccess={() => {
            loadThreads()
            if (selectedThreadId) loadActiveThread(selectedThreadId)
          }}
        />
      )}
    </div>
  )
}
