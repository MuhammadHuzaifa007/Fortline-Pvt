import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { syncEmailAccount } from '@/lib/email/sync-engine'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCeo()
    const { id } = await params

    const result = await syncEmailAccount(id)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      messagesSynced: result.messagesSynced,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
