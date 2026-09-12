import { describe, it, expect } from 'vitest'
import {
  isAutomatedEmail,
  calculateThreadMetrics,
  MessageTimestamp,
} from '../response-metrics'

describe('Response Metrics & Automated Email Engine', () => {
  describe('isAutomatedEmail', () => {
    it('detects out of office and auto-replies', () => {
      expect(
        isAutomatedEmail({
          subject: 'Automatic reply: Out of the office until Monday',
          sender_email: 'client@company.com',
        }),
      ).toBe(true)

      expect(
        isAutomatedEmail({
          subject: 'Auto-Reply: Thank you for your email',
          sender_email: 'info@client.com',
        }),
      ).toBe(true)
    })

    it('detects NDR and bounce notifications', () => {
      expect(
        isAutomatedEmail({
          subject: 'Undeliverable: Product Catalog inquiry',
          sender_email: 'mailer-daemon@mx.google.com',
        }),
      ).toBe(true)

      expect(
        isAutomatedEmail({
          subject: 'Delivery Status Notification (Failure)',
          sender_email: 'postmaster@fortline.net',
        }),
      ).toBe(true)
    })

    it('returns false for normal client emails', () => {
      expect(
        isAutomatedEmail({
          subject: 'Re: Quotation for Enterprise Servers',
          sender_email: 'procurement@acme.corp',
        }),
      ).toBe(false)
    })
  })

  describe('calculateThreadMetrics', () => {
    it('correctly calculates waiting_for as employee when client sends last message', () => {
      const messages: MessageTimestamp[] = [
        {
          direction: 'inbound',
          sent_at: '2026-09-12T10:00:00Z',
        },
      ]

      const metrics = calculateThreadMetrics(messages, 'normal', { normal: 4, high: 1 })
      expect(metrics.waitingFor).toBe('employee')
      expect(metrics.lastSenderType).toBe('client')
      expect(metrics.firstResponseSeconds).toBeNull()
    })

    it('correctly calculates waiting_for as client after employee reply', () => {
      const messages: MessageTimestamp[] = [
        {
          direction: 'inbound',
          sent_at: '2026-09-12T10:00:00Z',
        },
        {
          direction: 'outbound',
          sent_at: '2026-09-12T10:15:00Z',
        },
      ]

      const metrics = calculateThreadMetrics(messages, 'normal', { normal: 4, high: 1 })
      expect(metrics.waitingFor).toBe('client')
      expect(metrics.lastSenderType).toBe('employee')
      expect(metrics.firstResponseSeconds).toBe(900) // 15 minutes = 900 seconds
      expect(metrics.isOverdue).toBe(false)
    })

    it('excludes automated messages from metrics calculations', () => {
      const messages: MessageTimestamp[] = [
        {
          direction: 'inbound',
          sent_at: '2026-09-12T10:00:00Z',
        },
        {
          direction: 'inbound',
          sent_at: '2026-09-12T10:01:00Z',
          is_automated: true, // out of office auto-reply
        },
        {
          direction: 'outbound',
          sent_at: '2026-09-12T10:20:00Z',
        },
      ]

      const metrics = calculateThreadMetrics(messages, 'normal', { normal: 4, high: 1 })
      expect(metrics.firstResponseSeconds).toBe(1200) // 20 minutes from first real inbound
      expect(metrics.waitingFor).toBe('client')
    })
  })
})
