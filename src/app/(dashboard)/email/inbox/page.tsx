'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { EmailThread, EmailAccount, EmailMessage } from '@/types/email'
import { EmailComposer } from '@/components/email/email-composer'
import { EmailBadgeLogo } from '@/components/icons/whatsapp-business-logo'
import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Pencil,
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  AlertTriangle,
  Trash2,
  Paperclip,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  ArrowLeft,
  Users,
  Archive,
  Flag,
  Reply,
  ReplyAll,
  Forward,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { sanitizeEmailHtml } from '@/components/email/email-sanitizer'

type GmailFolder = 'inbox' | 'starred' | 'snoozed' | 'sent' | 'drafts' | 'overdue' | 'trash'
type GmailTab = 'primary' | 'sales_team' | 'overdue' | 'replied'

export default function EmailInboxPage({
  searchParams,
}: {
  searchParams?: Promise<{ account_id?: string; sales_rep_id?: string; thread_id?: string }>
}) {
  const resolvedParams = searchParams ? use(searchParams) : {}
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [totalThreads, setTotalThreads] = useState(0)
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [salesMembers, setSalesMembers] = useState<Array<{ id: string; name: string; division?: string }>>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    resolvedParams.thread_id || null,
  )
  const [activeThread, setActiveThread] = useState<EmailThread | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingActiveThread, setLoadingActiveThread] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  // Gmail Navigation & Tabs
  const [activeFolder, setActiveFolder] = useState<GmailFolder>('inbox')
  const [activeTab, setActiveTab] = useState<GmailTab>('primary')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [salesRepId, setSalesRepId] = useState(resolvedParams.sales_rep_id || '')
  const [accountId, setAccountId] = useState(resolvedParams.account_id || '')
  const [showFiltersPopover, setShowFiltersPopover] = useState(false)

  // Selection & Starred
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set())

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Reply state in thread view
  const [replyMessage, setReplyMessage] = useState<EmailMessage | null>(null)
  const [isReplyAll, setIsReplyAll] = useState(false)
  const [isForward, setIsForward] = useState(false)

  // Load Starred IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fortline_starred_threads')
      if (saved) {
        setStarredIds(new Set(JSON.parse(saved)))
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist Starred IDs
  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setStarredIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try {
        localStorage.setItem('fortline_starred_threads', JSON.stringify(Array.from(next)))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Load Accounts & Sales Members
  useEffect(() => {
    fetch('/api/email/accounts')
      .then((res) => res.json())
      .then((data) => {
        const accs: EmailAccount[] = data.accounts || []
        setAccounts(accs)
        const reps = accs
          .filter((a) => a.sales_member)
          .map((a) => ({
            id: a.sales_rep_id,
            name: a.sales_member!.name,
            division: a.sales_member!.division,
          }))
        setSalesMembers(reps)
      })
      .catch(() => {})
  }, [])

  // Load Threads list based on active folder, tab, search & filters
  const loadThreads = useCallback(async () => {
    setLoadingThreads(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(pageSize))
      params.set('offset', String((page - 1) * pageSize))

      if (search) params.set('search', search)
      if (salesRepId) params.set('sales_rep_id', salesRepId)
      if (accountId) params.set('account_id', accountId)

      // Folder constraints
      if (activeFolder === 'overdue') {
        params.set('is_overdue', 'true')
      } else if (activeFolder === 'sent') {
        params.set('waiting_for', 'client')
      } else if (activeFolder === 'trash') {
        params.set('status', 'closed')
      } else {
        // Default to open threads for inbox
        params.set('status', 'open')
      }

      // Tab constraints
      if (activeTab === 'overdue') {
        params.set('is_overdue', 'true')
      } else if (activeTab === 'replied') {
        params.set('waiting_for', 'client')
      }

      const res = await fetch(`/api/email/threads?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        let fetched: EmailThread[] = json.threads || []
        
        // Filter starred if on starred folder
        if (activeFolder === 'starred') {
          fetched = fetched.filter((t) => starredIds.has(t.id))
        }

        setThreads(fetched)
        setTotalThreads(json.total || fetched.length)
      }
    } catch {
      toast.error('Failed to load email threads')
    } finally {
      setLoadingThreads(false)
    }
  }, [search, salesRepId, accountId, activeFolder, activeTab, page, starredIds])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Load Active Thread detail when selected
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

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === threads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(threads.map((t) => t.id)))
    }
  }

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Batch actions
  const handleBatchStatus = async (newStatus: 'open' | 'closed') => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/email/threads/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          }),
        ),
      )
      toast.success(`${ids.length} conversations updated`)
      setSelectedIds(new Set())
      loadThreads()
      if (selectedThreadId && ids.includes(selectedThreadId)) {
        loadActiveThread(selectedThreadId)
      }
    } catch {
      toast.error('Failed to update conversations')
    }
  }

  // Reply from active thread
  const handleOpenReply = (message: EmailMessage, all: boolean) => {
    setReplyMessage(message)
    setIsReplyAll(all)
    setIsForward(false)
    setComposerOpen(true)
  }

  const handleOpenForward = (message: EmailMessage) => {
    setReplyMessage(message)
    setIsReplyAll(false)
    setIsForward(true)
    setComposerOpen(true)
  }

  // Format date like Gmail
  const formatGmailDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const overdueCount = threads.filter((t) => t.is_overdue).length

  return (
    <div className="flex flex-col h-[calc(100dvh-4.5rem)] overflow-hidden bg-background text-foreground">
      {/* ─────────────────────────────────────────────────────────────
          1. GMAIL TOP BAR: Rounded Search + Quick Actions
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/80 bg-background shrink-0 gap-3">
        {/* Left: Branding & Folder Sidebar Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle folders sidebar"
          >
            <Mail className="w-5 h-5 text-[#EA4335]" />
          </button>

          <div className="flex items-center gap-2">
            <EmailBadgeLogo className="h-7 w-7 shrink-0 shadow-sm" />
            <span className="text-base font-bold tracking-tight text-foreground hidden sm:inline">
              Gmail M365
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-[#EA4335] border border-red-500/20">
              Fortline
            </span>
          </div>
        </div>

        {/* Center: Prominent Gmail Rounded Pill Search Bar */}
        <div className="flex-1 max-w-2xl mx-auto">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search mail in Microsoft 365 (clients, subjects, content)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full h-10 pl-10 pr-10 rounded-full border border-border bg-muted/40 hover:bg-muted/60 focus:bg-background focus:border-[#EA4335]/60 focus:ring-2 focus:ring-[#EA4335]/20 text-xs transition-all outline-none"
            />
            <button
              type="button"
              onClick={() => setShowFiltersPopover(!showFiltersPopover)}
              className="absolute right-2.5 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Search filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Expandable Advanced Filters Popover */}
          {showFiltersPopover && (
            <div className="absolute z-30 mt-2 p-3 bg-popover border border-border rounded-xl shadow-xl w-80 max-w-[90vw] flex flex-col gap-2.5 text-xs">
              <span className="font-bold text-foreground">Filter Mailbox</span>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">Monitored Sales Member</label>
                <select
                  value={salesRepId}
                  onChange={(e) => {
                    setSalesRepId(e.target.value)
                    setPage(1)
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">All Sales Members ({salesMembers.length})</option>
                  {salesMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.division ? `(${m.division})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-muted-foreground">Authorized Mailbox</label>
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value)
                    setPage(1)
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">All Mailboxes ({accounts.length})</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.email_address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setSalesRepId('')
                    setAccountId('')
                    setSearch('')
                    setShowFiltersPopover(false)
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
                <Button
                  size="sm"
                  onClick={() => setShowFiltersPopover(false)}
                  className="h-7 text-xs bg-[#EA4335] hover:bg-[#D93025] text-white rounded-full px-3"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadThreads}
            className="flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Refresh mail"
          >
            <RefreshCw className={cn('w-4 h-4', loadingThreads && 'animate-spin text-[#EA4335]')} />
          </button>

          <Button
            type="button"
            size="sm"
            onClick={() => setComposerOpen(true)}
            className="rounded-full bg-[#EA4335] hover:bg-[#D93025] text-white font-semibold text-xs gap-1.5 shadow-sm px-4 h-9 hidden md:flex"
          >
            <Pencil className="w-3.5 h-3.5" />
            Compose
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN BODY: Gmail Left Folder Rail + Email Content Area
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Navigation Rail (Gmail style) */}
        {sidebarOpen && (
          <aside className="w-56 lg:w-60 border-r border-border/80 bg-background/95 p-3 flex flex-col gap-2 shrink-0 overflow-y-auto">
            {/* Prominent Gmail Compose Pill Button */}
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-3 px-5 py-3 rounded-full bg-[#EA4335] hover:bg-[#D93025] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 mb-2 group cursor-pointer"
            >
              <Pencil className="w-4 h-4 shrink-0 group-hover:rotate-12 transition-transform" />
              <span>Compose</span>
            </button>

            {/* Folder List Items */}
            <nav className="flex flex-col gap-0.5">
              {[
                { id: 'inbox' as GmailFolder, label: 'Inbox', icon: Inbox, count: totalThreads },
                { id: 'starred' as GmailFolder, label: 'Starred', icon: Star, count: starredIds.size },
                { id: 'snoozed' as GmailFolder, label: 'Snoozed', icon: Clock },
                { id: 'sent' as GmailFolder, label: 'Sent', icon: Send },
                { id: 'drafts' as GmailFolder, label: 'Drafts', icon: FileText },
                { id: 'overdue' as GmailFolder, label: 'Overdue SLA', icon: AlertTriangle, count: overdueCount, alert: true },
                { id: 'trash' as GmailFolder, label: 'Trash / Closed', icon: Trash2 },
              ].map((f) => {
                const isActive = activeFolder === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setActiveFolder(f.id)
                      setSelectedThreadId(null)
                      setPage(1)
                    }}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-r-full text-xs font-medium transition-colors w-full cursor-pointer',
                      isActive
                        ? 'bg-red-500/10 text-[#EA4335] font-bold border-l-4 border-[#EA4335]'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <f.icon className={cn('w-4 h-4 shrink-0', isActive && 'text-[#EA4335]')} />
                      <span className="truncate">{f.label}</span>
                    </div>
                    {f.count !== undefined && f.count > 0 && (
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-full font-bold',
                          f.alert
                            ? 'bg-[#EA4335] text-white'
                            : isActive
                              ? 'bg-[#EA4335]/20 text-[#EA4335]'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {f.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            <div className="my-2 border-t border-border/60" />

            {/* Monitored Sales Members Filter List */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 py-1">
                Monitored Sales Reps ({salesMembers.length})
              </span>
              <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
                {salesMembers.map((rep) => {
                  const isRepActive = salesRepId === rep.id
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => {
                        setSalesRepId(isRepActive ? '' : rep.id)
                        setPage(1)
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] transition-colors text-left truncate cursor-pointer',
                        isRepActive
                          ? 'bg-[#EA4335]/15 text-[#EA4335] font-bold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{rep.name}</span>
                      {rep.division && (
                        <span className="text-[9px] text-muted-foreground/70 shrink-0">
                          {rep.division.slice(0, 4)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. CENTER AREA: Either Gmail Table or Reading Detail View
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          {/* If an email is currently selected, show the Gmail Reading View */}
          {activeThread ? (
            <div className="flex flex-col h-full overflow-hidden bg-background">
              {/* Reading View Header Actions Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/60 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Inbox
                  </button>

                  <div className="h-4 w-px bg-border mx-1" />

                  <button
                    type="button"
                    onClick={() => {
                      handleBatchStatus(activeThread.status === 'open' ? 'closed' : 'open')
                    }}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title={activeThread.status === 'open' ? 'Close conversation' : 'Reopen conversation'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => toggleStar(activeThread.id, e)}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-amber-500 cursor-pointer"
                    title="Star thread"
                  >
                    <Star
                      className={cn(
                        'w-4 h-4',
                        starredIds.has(activeThread.id) && 'text-amber-500 fill-amber-500',
                      )}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = activeThread.priority === 'high' ? 'normal' : 'high'
                      fetch(`/api/email/threads/${activeThread.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priority: next }),
                      }).then(() => {
                        toast.success(`Priority set to ${next}`)
                        loadActiveThread(activeThread.id)
                      })
                    }}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-[#EA4335] cursor-pointer"
                    title="Toggle high priority"
                  >
                    <Flag
                      className={cn(
                        'w-4 h-4',
                        activeThread.priority === 'high' && 'text-[#EA4335] fill-[#EA4335]',
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Monitored Mailbox: <strong>{activeThread.email_account?.email_address}</strong></span>
                </div>
              </div>

              {/* Subject Title & Details Header */}
              <div className="px-6 py-4 border-b border-border bg-card shrink-0 space-y-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <h1 className="text-lg font-bold text-foreground">
                    {activeThread.subject || '(No Subject)'}
                  </h1>

                  <div className="flex items-center gap-2">
                    {activeThread.is_overdue && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-[#EA4335] border border-red-500/30">
                        <AlertTriangle className="w-3 h-3" /> Overdue SLA
                      </span>
                    )}
                    {activeThread.waiting_for === 'employee' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Clock className="w-3 h-3" /> Waiting for Rep
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Replied
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#EA4335]" />
                    Client: <strong className="text-foreground">{activeThread.client_name || activeThread.client_email}</strong>
                  </span>
                  <span>&bull;</span>
                  <span>Assigned Rep: <strong className="text-foreground">{activeThread.sales_member?.name || 'Sales Rep'}</strong> ({activeThread.sales_member?.division || 'Sales'})</span>
                  <span>&bull;</span>
                  <span>{activeThread.messages?.length || 0} messages</span>
                </div>
              </div>

              {/* Messages Flow Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {loadingActiveThread ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#EA4335] border-t-transparent" />
                  </div>
                ) : (
                  (activeThread.messages || []).map((message) => {
                    const isOutbound = message.direction === 'outbound'
                    const sanitized = message.body_html ? sanitizeEmailHtml(message.body_html) : null

                    return (
                      <div
                        key={message.id}
                        className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
                      >
                        {/* Message Header */}
                        <div className="flex items-center justify-between p-4 bg-muted/20 border-b border-border/50 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Round Avatar */}
                            <div
                              className={cn(
                                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white',
                                isOutbound ? 'bg-[#EA4335]' : 'bg-emerald-600',
                              )}
                            >
                              {(message.sender_name || message.sender_email || '?').charAt(0).toUpperCase()}
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground truncate">
                                  {message.sender_name || message.sender_email}
                                </span>
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                                    isOutbound
                                      ? 'bg-red-500/10 text-[#EA4335]'
                                      : 'bg-emerald-500/10 text-emerald-500',
                                  )}
                                >
                                  {isOutbound ? 'Outbound' : 'Inbound'}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground truncate">
                                to: {message.recipients.map((r) => r.email).join(', ')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatGmailDate(message.sent_at)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenReply(message, false)}
                              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Reply"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenReply(message, true)}
                              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Reply All"
                            >
                              <ReplyAll className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenForward(message)}
                              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Forward"
                            >
                              <Forward className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Email Body */}
                        <div className="p-5 text-xs leading-relaxed text-foreground min-h-[60px] overflow-x-auto">
                          {sanitized ? (
                            <div
                              dangerouslySetInnerHTML={{ __html: sanitized }}
                              className="prose prose-sm dark:prose-invert max-w-none break-words"
                            />
                          ) : (
                            <p className="whitespace-pre-wrap">
                              {message.body_text || message.snippet || '(No content)'}
                            </p>
                          )}
                        </div>

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="px-5 pb-4 pt-2 border-t border-border/40 flex flex-wrap gap-2">
                            {message.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={`/api/email/attachments/${message.id}/${att.provider_attachment_id}`}
                                download={att.filename}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors text-xs font-medium"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-[#EA4335]" />
                                <span className="truncate max-w-[200px]">{att.filename}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Quick Reply Trigger Bar */}
              <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const lastMsg = activeThread.messages?.[activeThread.messages.length - 1]
                      if (lastMsg) handleOpenReply(lastMsg, false)
                    }}
                    className="rounded-full bg-[#EA4335] hover:bg-[#D93025] text-white font-semibold text-xs gap-1.5 px-4 h-8 shadow-sm"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Reply
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastMsg = activeThread.messages?.[activeThread.messages.length - 1]
                      if (lastMsg) handleOpenReply(lastMsg, true)
                    }}
                    className="rounded-full text-xs gap-1.5 px-4 h-8"
                  >
                    <ReplyAll className="w-3.5 h-3.5" />
                    Reply All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastMsg = activeThread.messages?.[activeThread.messages.length - 1]
                      if (lastMsg) handleOpenForward(lastMsg)
                    }}
                    className="rounded-full text-xs gap-1.5 px-4 h-8"
                  >
                    <Forward className="w-3.5 h-3.5" />
                    Forward
                  </Button>
                </div>

                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Sending as: <strong>{activeThread.email_account?.email_address}</strong>
                </span>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────
               GMAIL FULL-WIDTH TABLE LIST
            ───────────────────────────────────────────────────────── */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Top Action Toolbar (Select all, Refresh, Pagination) */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/80 bg-background shrink-0">
                {/* Left: Checkbox + Actions */}
                <div className="flex items-center gap-2">
                  {/* Select All Checkbox */}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className={cn(
                        'w-4 h-4 rounded-sm border flex items-center justify-center transition-colors cursor-pointer',
                        selectedIds.size > 0
                          ? 'bg-[#EA4335] border-[#EA4335] text-white'
                          : 'border-muted-foreground/40 hover:border-foreground bg-background',
                      )}
                      title="Select all"
                    >
                      {selectedIds.size > 0 && (
                        <span className="text-[10px] leading-none font-bold">✓</span>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={loadThreads}
                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', loadingThreads && 'animate-spin')} />
                  </button>

                  {/* Batch Action Buttons when items selected */}
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border animate-in fade-in-50">
                      <button
                        type="button"
                        onClick={() => handleBatchStatus('closed')}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Archive / Close selected"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchStatus('closed')}
                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-[#EA4335] cursor-pointer"
                        title="Delete / Move to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-semibold text-[#EA4335] ml-1">
                        {selectedIds.size} selected
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Pagination */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {totalThreads === 0 ? '0' : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, totalThreads)} of ${totalThreads}`}
                  </span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="p-1.5 rounded-full hover:bg-muted disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={page * pageSize >= totalThreads}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 rounded-full hover:bg-muted disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Tabs (Primary, Sales Team, Overdue SLA) */}
              <div className="flex items-center border-b border-border px-2 shrink-0 bg-muted/10">
                {[
                  { id: 'primary' as GmailTab, label: 'Primary', icon: Mail },
                  { id: 'sales_team' as GmailTab, label: 'Sales Team', icon: Users },
                  { id: 'overdue' as GmailTab, label: 'Overdue SLA', icon: AlertTriangle, count: overdueCount, alert: true },
                  { id: 'replied' as GmailTab, label: 'Replied', icon: CheckCircle2 },
                ].map((tab) => {
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id)
                        setPage(1)
                      }}
                      className={cn(
                        'flex items-center gap-2 px-6 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer',
                        isActive
                          ? 'border-[#EA4335] text-[#EA4335]'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30',
                      )}
                    >
                      <tab.icon className={cn('w-4 h-4', isActive && 'text-[#EA4335]')} />
                      <span>{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                            tab.alert
                              ? 'bg-[#EA4335] text-white'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Full-Width Gmail Email Rows */}
              <div className="flex-1 overflow-y-auto divide-y divide-border/60">
                {loadingThreads ? (
                  <div className="divide-y divide-border/40">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                        <div className="w-4 h-4 rounded bg-muted shrink-0" />
                        <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
                        <div className="w-36 h-4 rounded bg-muted shrink-0" />
                        <div className="flex-1 h-4 rounded bg-muted" />
                        <div className="w-16 h-4 rounded bg-muted shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mb-3 text-[#EA4335] opacity-50" />
                    <p className="text-sm font-semibold text-foreground">Your inbox is clean</p>
                    <p className="text-xs mt-1">No conversations found for the selected view.</p>
                  </div>
                ) : (
                  threads.map((thread) => {
                    const isSelected = selectedIds.has(thread.id)
                    const isStarred = starredIds.has(thread.id)
                    const hasUnread = thread.unread_count > 0

                    return (
                      <div
                        key={thread.id}
                        onClick={() => setSelectedThreadId(thread.id)}
                        className={cn(
                          'group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer text-xs select-none relative',
                          isSelected && 'bg-red-500/5',
                          hasUnread ? 'bg-background font-semibold' : 'bg-muted/10 text-muted-foreground',
                        )}
                      >
                        {/* Checkbox */}
                        <div
                          className="shrink-0"
                          onClick={(e) => handleToggleSelect(thread.id, e)}
                        >
                          <div
                            className={cn(
                              'w-4 h-4 rounded-sm border flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-[#EA4335] border-[#EA4335] text-white'
                                : 'border-muted-foreground/40 hover:border-foreground bg-background',
                            )}
                          >
                            {isSelected && (
                              <span className="text-[10px] leading-none font-bold">✓</span>
                            )}
                          </div>
                        </div>

                        {/* Star Toggle */}
                        <button
                          type="button"
                          onClick={(e) => toggleStar(thread.id, e)}
                          className="shrink-0 text-muted-foreground/50 hover:text-amber-500 p-0.5"
                          title="Star"
                        >
                          <Star
                            className={cn(
                              'w-4 h-4 transition-colors',
                              isStarred && 'text-amber-500 fill-amber-500',
                            )}
                          />
                        </button>

                        {/* Sender Name Column */}
                        <div className="w-36 sm:w-44 shrink-0 truncate">
                          <span
                            className={cn(
                              'truncate',
                              hasUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/85',
                            )}
                          >
                            {thread.client_name || thread.client_email}
                          </span>
                        </div>

                        {/* Subject + Snippet Preview */}
                        <div className="flex-1 flex items-center gap-2 min-w-0 truncate">
                          <span
                            className={cn(
                              'truncate shrink-0 max-w-sm',
                              hasUnread ? 'font-bold text-foreground' : 'text-foreground/90 font-medium',
                            )}
                          >
                            {thread.subject || '(No Subject)'}
                          </span>

                          <span className="text-muted-foreground/70 truncate hidden md:inline">
                            &mdash; {thread.client_company ? `[${thread.client_company}] ` : ''}
                            Conversation with monitored rep {thread.sales_member?.name || 'Sales Rep'}
                          </span>
                        </div>

                        {/* Indicators & Badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {thread.has_attachments && (
                            <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}

                          {/* Rep Badge */}
                          {thread.sales_member && (
                            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium text-muted-foreground">
                              Rep: {thread.sales_member.name}
                            </span>
                          )}

                          {/* Status badges */}
                          {thread.is_overdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-[#EA4335] border border-red-500/30">
                              Overdue
                            </span>
                          )}

                          {thread.waiting_for === 'employee' && (
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Needs Reply
                            </span>
                          )}
                        </div>

                        {/* Date Timestamp / Hover Actions */}
                        <div className="w-20 text-right shrink-0">
                          {/* Normal state: Date */}
                          <span className="text-[11px] text-muted-foreground group-hover:hidden">
                            {formatGmailDate(thread.last_message_at)}
                          </span>

                          {/* Hover state: Floating quick actions */}
                          <div className="hidden group-hover:flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleBatchStatus(thread.status === 'open' ? 'closed' : 'open')
                              }}
                              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Archive / Close"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleBatchStatus('closed')
                              }}
                              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-[#EA4335] cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Email Composer Modal (CEO Send-As) */}
      {composerOpen && (
        <EmailComposer
          accounts={accounts}
          defaultAccountId={activeThread?.email_account_id}
          initialTo={
            replyMessage
              ? [{ email: replyMessage.sender_email || activeThread?.client_email || '' }]
              : []
          }
          initialSubject={
            isForward
              ? `Fwd: ${activeThread?.subject || ''}`
              : replyMessage
                ? activeThread?.subject?.startsWith('Re:')
                  ? activeThread.subject
                  : `Re: ${activeThread?.subject || ''}`
                : ''
          }
          replyToMessageId={replyMessage?.provider_message_id}
          threadId={activeThread?.id}
          isReplyAll={isReplyAll}
          isForward={isForward}
          onClose={() => {
            setComposerOpen(false)
            setReplyMessage(null)
          }}
          onSuccess={() => {
            loadThreads()
            if (selectedThreadId) loadActiveThread(selectedThreadId)
          }}
        />
      )}
    </div>
  )
}
