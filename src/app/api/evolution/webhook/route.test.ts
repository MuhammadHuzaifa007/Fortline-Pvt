import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

describe('/api/evolution/webhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET', () => {
    it('returns 200 with service info', async () => {
      const res = await GET()
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({
        ok: true,
        service: 'Fortline Evolution Webhook',
      })
    })
  })

  describe('POST', () => {
    it('accepts valid JSON payload and logs event, instance, and key details', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const payload = {
        event: 'messages.upsert',
        instance: 'sales-rep-01',
        data: {
          key: {
            remoteJid: '923001234567@s.whatsapp.net',
            fromMe: false,
            id: 'MSG_123456',
          },
          message: {
            conversation: 'Hello Fortline',
          },
        },
      }

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ ok: true })

      expect(logSpy).toHaveBeenCalledWith('[Evolution Webhook]', {
        event: 'messages.upsert',
        instance: 'sales-rep-01',
        remoteJid: '923001234567@s.whatsapp.net',
        fromMe: false,
        id: 'MSG_123456',
      })
    })

    it('returns { ok: true, ignored: true } when JSON is malformed', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid-json{{{',
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ ok: true, ignored: true })
      expect(warnSpy).toHaveBeenCalled()
    })

    it('handles events without key details gracefully', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const payload = {
        event: 'connection.update',
        instance: 'sales-rep-02',
        data: {
          status: 'open',
        },
      }

      const req = new NextRequest('http://localhost:3000/api/evolution/webhook', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const res = await POST(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toEqual({ ok: true })

      expect(logSpy).toHaveBeenCalledWith('[Evolution Webhook]', {
        event: 'connection.update',
        instance: 'sales-rep-02',
      })
    })
  })
})
