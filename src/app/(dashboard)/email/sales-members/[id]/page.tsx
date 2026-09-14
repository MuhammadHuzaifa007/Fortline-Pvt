'use client'

import { useEffect, useState, use } from 'react'
import { EmailThread, EmailAccount } from '@/types/email'
import { EmailComposer } from '@/components/email/email-composer'
import {
  UsersRound,
  Mail,
  Clock,
  AlertTriangle,
  Send,
  ArrowLeft,
  Paperclip,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SalesMemberEmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [member, setMember] = useState<any>(null)
  const [account, setAccount] = useState<EmailAccount | null>(null)
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [memRes, accRes, threadRes] = await Promise.all([
        fetch('/api/fortline/sales-members'),
        fetch('/api/email/accounts'),
        fetch(`/api/email/threads?sales_rep_id=${id}`),
      ])

      if (memRes.ok) {
        const json = await memRes.json()
        const found = (json.members || []).find((m: { id: string }) => m.id === id)
        setMember(found)
      }

      if (accRes.ok) {
        const json = await accRes.json()
        const found = (json.accounts || []).find((a: EmailAccount) => a.sales_rep_id === id)
        setAccount(found)
      }

      if (threadRes.ok) {
        const json = await threadRes.json()
        setThreads(json.threads || [])
      }
    } catch {
      toast.error('Failed to load sales member details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>Sales member not found.</p>
        <Link href="/email/sales-members" className="text-primary hover:underline text-xs mt-2 inline-block">
          &larr; Back to Sales Members
        </Link>
      </div>
    )
  }

  const overdueCount = threads.filter((t) => t.is_overdue).length
  const waitingForRepCount = threads.filter((t) => t.waiting_for === 'employee').length

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/email/sales-members"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sales Members
        </Link>
      </div>

      {/* Member Header Card */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black border border-primary/20">
            {member.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-foreground">{member.name}</h1>
            <p className="text-xs text-muted-foreground">
              {member.division} &bull; {member.designation} &bull; {member.phone_number}
            </p>
            <span className="font-mono text-xs text-primary font-semibold mt-0.5">
              {account?.email_address || member.email_address}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {account && (
            <Button
              type="button"
              size="sm"
              onClick={() => setComposerOpen(true)}
              className="gap-1.5 h-9 text-xs font-semibold bg-[#2B60DE] hover:bg-[#2B60DE]/90 text-white rounded-full shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              Send As {member.name.split(' ')[0]}
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-semibold text-muted-foreground">Total Threads</span>
          <div className="text-2xl font-bold text-foreground mt-1">{threads.length}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-semibold text-muted-foreground">Needs Rep Reply</span>
          <div className="text-2xl font-bold text-amber-500 mt-1">{waitingForRepCount}</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-semibold text-muted-foreground">Overdue SLA</span>
          <div className={cn('text-2xl font-bold mt-1', overdueCount > 0 ? 'text-[#2B60DE]' : 'text-foreground')}>
            {overdueCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card">
          <span className="text-xs font-semibold text-muted-foreground">Mailbox Status</span>
          <div className="text-sm font-bold text-foreground mt-2 capitalize flex items-center gap-1.5">
            {account?.connection_status === 'connected' ? (
              <CheckCircle2 className="w-4 h-4 text-[#2B60DE]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            {account?.connection_status || 'Disconnected'}
          </div>
        </div>
      </div>

      {/* Threads Table for this Member */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            Client Email Conversations ({threads.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3">Client</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Waiting For</th>
                <th className="p-3">Status</th>
                <th className="p-3">Last Activity</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {threads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No active email threads for this sales member.
                  </td>
                </tr>
              ) : (
                threads.map((thread) => (
                  <tr key={thread.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-semibold text-foreground">
                      {thread.client_name || thread.client_email}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 max-w-xs truncate">
                        <span className="truncate">{thread.subject || '(No Subject)'}</span>
                        {thread.has_attachments && <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />}
                      </div>
                    </td>
                    <td className="p-3">
                      {thread.waiting_for === 'employee' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" /> Needs Reply
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Replied</span>
                      )}
                    </td>
                    <td className="p-3">
                      {thread.is_overdue ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600/15 text-[#2B60DE] border border-blue-600/30">
                          <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                        </span>
                      ) : (
                        <span className="capitalize">{thread.status}</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(thread.last_message_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/email/inbox?thread_id=${thread.id}`}
                        className="text-primary hover:underline font-semibold"
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Composer Modal */}
      {composerOpen && account && (
        <EmailComposer
          accounts={[account]}
          defaultAccountId={account.id}
          onClose={() => setComposerOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
