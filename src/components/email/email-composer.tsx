'use client'

import { useState } from 'react'
import { EmailAccount, EmailRecipient } from '@/types/email'
import { Send, X, Paperclip, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface EmailComposerProps {
  accounts: EmailAccount[]
  defaultAccountId?: string
  initialTo?: EmailRecipient[]
  initialCc?: EmailRecipient[]
  initialSubject?: string
  initialBodyHtml?: string
  replyToMessageId?: string
  threadId?: string
  isReplyAll?: boolean
  isForward?: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EmailComposer({
  accounts,
  defaultAccountId,
  initialTo = [],
  initialCc = [],
  initialSubject = '',
  initialBodyHtml = '',
  replyToMessageId,
  threadId,
  isReplyAll = false,
  isForward = false,
  onClose,
  onSuccess,
}: EmailComposerProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    defaultAccountId || accounts[0]?.id || '',
  )
  const [toInput, setToInput] = useState(
    initialTo.map((r) => r.email).join(', '),
  )
  const [ccInput, setCcInput] = useState(
    initialCc.map((r) => r.email).join(', '),
  )
  const [showCc, setShowCc] = useState(initialCc.length > 0)
  const [subject, setSubject] = useState(initialSubject)
  const [bodyText, setBodyText] = useState(initialBodyHtml)
  const [sending, setSending] = useState(false)
  const [attachments, setAttachments] = useState<
    Array<{ filename: string; mime_type: string; content_bytes_base64: string; size: number }>
  >([])

  const parseEmails = (input: string): EmailRecipient[] => {
    return input
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0)
      .map((email) => ({ email }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const reader = new FileReader()
      reader.onload = () => {
        const base64Content = (reader.result as string).split(',')[1]
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            mime_type: file.type || 'application/octet-stream',
            content_bytes_base64: base64Content,
            size: file.size,
          },
        ])
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    const to = parseEmails(toInput)
    if (to.length === 0) {
      toast.error('Please enter at least one recipient email address')
      return
    }

    if (!subject.trim() && !replyToMessageId) {
      toast.error('Please enter a subject')
      return
    }

    if (!selectedAccountId) {
      toast.error('Please select an authorized mailbox to send from')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_account_id: selectedAccountId,
          to,
          cc: parseEmails(ccInput),
          subject: subject.trim(),
          body_html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5;">${bodyText.replace(/\n/g, '<br/>')}</div>`,
          body_text: bodyText,
          reply_to_message_id: replyToMessageId,
          thread_id: threadId,
          is_reply_all: isReplyAll,
          is_forward: isForward,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            mime_type: a.mime_type,
            content_bytes_base64: a.content_bytes_base64,
          })),
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to send email')
      }

      toast.success(
        isForward
          ? 'Email forwarded successfully'
          : replyToMessageId
            ? 'Reply sent successfully'
            : 'Email sent successfully',
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <h3 className="text-sm font-bold text-foreground">
            {isForward
              ? 'Forward Email'
              : isReplyAll
                ? 'Reply All to Email'
                : replyToMessageId
                  ? 'Reply to Email'
                  : 'Compose New Email (CEO Send-As)'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Composer Form */}
        <form onSubmit={handleSend} className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
          {/* Send-As Mailbox Selector (Authoritative backend verification) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0">
              From:
            </span>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#2B60DE]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.email_address} ({acc.sales_member?.name || acc.display_name || 'Sales Rep'})
                </option>
              ))}
            </select>
          </div>

          {selectedAccount?.connection_status !== 'connected' && (
            <div className="flex items-center gap-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Note: This mailbox is currently marked {selectedAccount?.connection_status}. Ensure Microsoft Graph permissions are granted.
              </span>
            </div>
          )}

          {/* To */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0">
              To:
            </span>
            <Input
              type="text"
              placeholder="client@company.com (comma separated)"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className="h-9 text-xs"
              required
            />
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-xs text-[#2B60DE] hover:underline px-1"
              >
                + CC
              </button>
            )}
          </div>

          {/* CC */}
          {showCc && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0">
                CC:
              </span>
              <Input
                type="text"
                placeholder="colleague@company.com"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground w-12 shrink-0">
              Subject:
            </span>
            <Input
              type="text"
              placeholder="Email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1 mt-1">
            <textarea
              rows={10}
              placeholder="Write your email here..."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full rounded-md border border-input bg-background p-3 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#2B60DE] font-sans resize-none"
              required
            />
          </div>

          {/* Attachments List */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/40 text-xs"
                >
                  <Paperclip className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments(attachments.filter((_, i) => i !== idx))
                    }
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
            <label className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Paperclip className="w-4 h-4" />
              <span>Attach files</span>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={sending}
                className="rounded-full px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={sending}
                className="gap-1.5 px-5 rounded-full bg-[#2B60DE] hover:bg-[#2B60DE]/90 text-white font-semibold shadow-md"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
