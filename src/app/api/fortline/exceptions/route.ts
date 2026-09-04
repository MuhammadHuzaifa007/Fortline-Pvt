import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { loadExceptions } from '@/lib/fortline/queries';

export async function GET() {
  try {
    const ctx = await requireCeo();
    const exceptions = await loadExceptions(ctx.supabase, ctx.accountId);
    return NextResponse.json(exceptions);
  } catch (err) {
    return toErrorResponse(err);
  }
}
