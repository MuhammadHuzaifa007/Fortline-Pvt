import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'Fortline Evolution Webhook',
    },
    { status: 200 }
  )
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown> | null = null

  try {
    payload = (await request.json()) as Record<string, unknown>
  } catch (err) {
    console.warn('[Evolution Webhook] Failed to parse JSON payload:', err)
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 })
  }

  const event = payload?.event
  const instance = payload?.instance
  const data = payload?.data as Record<string, unknown> | undefined
  const key = (data?.key ?? (Array.isArray(data) ? (data[0] as Record<string, unknown>)?.key : undefined)) as
    | { remoteJid?: string; fromMe?: boolean; id?: string }
    | undefined

  const logPayload: Record<string, unknown> = {
    event,
    instance,
  }

  if (key?.remoteJid !== undefined) {
    logPayload.remoteJid = key.remoteJid
  }
  if (key?.fromMe !== undefined) {
    logPayload.fromMe = key.fromMe
  }
  if (key?.id !== undefined) {
    logPayload.id = key.id
  }

  console.log('[Evolution Webhook]', logPayload)

  return NextResponse.json({ ok: true }, { status: 200 })
}
