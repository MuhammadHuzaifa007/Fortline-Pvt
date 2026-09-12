import { NextResponse } from 'next/server'
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth'
import { manageMailboxSubscriptions } from '@/lib/email/subscription-manager'

export async function POST() {
  try {
    await requireCeo()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fortline-pvt.vercel.app'
    const webhookUrl = `${siteUrl.replace(/\/$/, '')}/api/email/webhook`

    const result = await manageMailboxSubscriptions(webhookUrl)

    return NextResponse.json({
      success: true,
      created: result.created,
      renewed: result.renewed,
      errors: result.errors,
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
