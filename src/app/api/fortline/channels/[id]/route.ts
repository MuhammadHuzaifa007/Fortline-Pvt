import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { updateChannel } from '@/lib/fortline/mutations';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireCeo();
    const { id } = await params;
    const body = await request.json();

    const result = await updateChannel(
      ctx.supabase,
      id,
      body,
      { userId: ctx.userId },
      ctx.accountId
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
