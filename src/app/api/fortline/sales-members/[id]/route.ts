import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { updateSalesMember, deleteSalesMember } from '@/lib/fortline/mutations';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireCeo();
    const { id } = await params;

    const { data, error } = await ctx.supabase
      .from('fortline_sales_members')
      .select('*')
      .eq('id', id)
      .eq('account_id', ctx.accountId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Sales member not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireCeo();
    const { id } = await params;
    const body = await request.json();

    const result = await updateSalesMember(
      ctx.supabase,
      id,
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireCeo();
    const { id } = await params;

    const result = await deleteSalesMember(
      ctx.supabase,
      id,
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
