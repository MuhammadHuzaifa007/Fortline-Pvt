import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { bulkReplaceSalesMembers } from '@/lib/fortline/mutations';

export async function POST(request: Request) {
  try {
    const ctx = await requireCeo();
    const body = await request.json();

    const members = body.members;
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'An array of "members" is required with name and phone_number' },
        { status: 400 }
      );
    }

    const clearExisting = body.clearExisting !== false; // default true

    const result = await bulkReplaceSalesMembers(
      ctx.supabase,
      ctx.accountId,
      members,
      { userId: ctx.userId },
      clearExisting
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, count: result.count });
  } catch (err) {
    return toErrorResponse(err);
  }
}
