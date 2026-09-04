import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { loadChannels } from '@/lib/fortline/queries';

export async function GET() {
  try {
    const ctx = await requireCeo();
    const channels = await loadChannels(ctx.supabase, ctx.accountId);
    return NextResponse.json(channels);
  } catch (err) {
    return toErrorResponse(err);
  }
}
