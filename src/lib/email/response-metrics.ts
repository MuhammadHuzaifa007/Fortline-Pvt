import { EmailDirection, WaitingFor, ThreadPriority } from '@/types/email'

export interface MessageTimestamp {
  direction: EmailDirection
  sent_at: string | Date
  is_automated?: boolean
}

/**
 * Detects if an email is automated (out-of-office, NDR/bounce, auto-reply, newsletter)
 */
export function isAutomatedEmail(headers: {
  subject?: string
  sender_email?: string
  precedence?: string
  autoSubmitted?: string
  xAutoResponse?: string
}): boolean {
  const subject = (headers.subject || '').toLowerCase()
  const sender = (headers.sender_email || '').toLowerCase()
  const autoSub = (headers.autoSubmitted || '').toLowerCase()
  const xAuto = (headers.xAutoResponse || '').toLowerCase()

  if (
    sender.includes('mailer-daemon') ||
    sender.includes('postmaster') ||
    sender.includes('noreply') ||
    sender.includes('no-reply')
  ) {
    return true
  }

  if (
    subject.startsWith('automatic reply:') ||
    subject.startsWith('auto-reply:') ||
    subject.startsWith('out of office:') ||
    subject.startsWith('undeliverable:') ||
    subject.includes('delivery status notification')
  ) {
    return true
  }

  if (autoSub && autoSub !== 'no') {
    return true
  }

  if (xAuto && xAuto !== 'no') {
    return true
  }

  return false
}

/**
 * Calculates response metrics from a list of chronologically ordered messages
 */
export function calculateThreadMetrics(
  messages: MessageTimestamp[],
  priority: ThreadPriority = 'normal',
  slaHours: { normal: number; high: number } = { normal: 4, high: 1 },
): {
  firstResponseSeconds: number | null
  firstResponseAt: string | null
  avgResponseSeconds: number | null
  waitingFor: WaitingFor
  isOverdue: boolean
  lastSenderType: 'employee' | 'client'
} {
  if (messages.length === 0) {
    return {
      firstResponseSeconds: null,
      firstResponseAt: null,
      avgResponseSeconds: null,
      waitingFor: 'none',
      isOverdue: false,
      lastSenderType: 'client',
    }
  }

  // Filter out automated messages for SLA/response time calculations
  const validMessages = messages
    .filter((m) => !m.is_automated)
    .map((m) => ({
      direction: m.direction,
      timestamp: new Date(m.sent_at).getTime(),
      dateStr: new Date(m.sent_at).toISOString(),
    }))
    .sort((a, b) => a.timestamp - b.timestamp)

  if (validMessages.length === 0) {
    return {
      firstResponseSeconds: null,
      firstResponseAt: null,
      avgResponseSeconds: null,
      waitingFor: 'none',
      isOverdue: false,
      lastSenderType: 'client',
    }
  }

  const lastMsg = validMessages[validMessages.length - 1]
  const lastSenderType = lastMsg.direction === 'inbound' ? 'client' : 'employee'
  const waitingFor: WaitingFor = lastMsg.direction === 'inbound' ? 'employee' : 'client'

  // Calculate First Response Time
  let firstResponseSeconds: number | null = null
  let firstResponseAt: string | null = null

  // Find first inbound message
  const firstInboundIndex = validMessages.findIndex((m) => m.direction === 'inbound')
  if (firstInboundIndex !== -1) {
    const firstInbound = validMessages[firstInboundIndex]
    // Find first outbound reply after that inbound message
    const firstOutboundAfter = validMessages
      .slice(firstInboundIndex + 1)
      .find((m) => m.direction === 'outbound')

    if (firstOutboundAfter) {
      const diffSec = Math.max(
        0,
        Math.floor((firstOutboundAfter.timestamp - firstInbound.timestamp) / 1000),
      )
      firstResponseSeconds = diffSec
      firstResponseAt = firstOutboundAfter.dateStr
    }
  }

  // Calculate Average Response Time across all inbound -> outbound cycles
  const responseIntervals: number[] = []
  let pendingInboundTime: number | null = null

  for (const msg of validMessages) {
    if (msg.direction === 'inbound') {
      if (pendingInboundTime === null) {
        pendingInboundTime = msg.timestamp
      }
    } else if (msg.direction === 'outbound' && pendingInboundTime !== null) {
      const intervalSec = Math.max(0, Math.floor((msg.timestamp - pendingInboundTime) / 1000))
      responseIntervals.push(intervalSec)
      pendingInboundTime = null
    }
  }

  const avgResponseSeconds =
    responseIntervals.length > 0
      ? Math.round(
          responseIntervals.reduce((sum, val) => sum + val, 0) / responseIntervals.length,
        )
      : null

  // Check Overdue status
  const targetSlaHours = priority === 'high' ? slaHours.high : slaHours.normal
  const slaThresholdMs = targetSlaHours * 60 * 60 * 1000
  let isOverdue = false

  if (waitingFor === 'employee') {
    const timeSinceLastMessage = Date.now() - lastMsg.timestamp
    if (timeSinceLastMessage > slaThresholdMs) {
      isOverdue = true
    }
  }

  return {
    firstResponseSeconds,
    firstResponseAt,
    avgResponseSeconds,
    waitingFor,
    isOverdue,
    lastSenderType,
  }
}
