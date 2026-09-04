import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { loadKpiConfig } from '@/lib/fortline/queries';
import { updateKpiConfig } from '@/lib/fortline/mutations';

export async function GET() {
  try {
    const ctx = await requireCeo();
    const config = await loadKpiConfig(ctx.supabase, ctx.accountId);
    return NextResponse.json(config);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireCeo();
    const body = await request.json();

    const result = await updateKpiConfig(
      ctx.supabase,
      body,
      { userId: ctx.userId },
      ctx.accountId
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
