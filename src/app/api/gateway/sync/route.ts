import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { syncGatewayChatsForSalesMember } from '@/lib/gateway/sync';
import { getGatewayConfig } from '@/lib/gateway/config';

export async function POST(request: Request) {
  try {
    const ctx = await requireCeo();
    const body = await request.json();
    const salesMemberId = body.salesMemberId;

    if (!salesMemberId) {
      return NextResponse.json({ error: 'salesMemberId is required' }, { status: 400 });
    }

    const config = await getGatewayConfig(ctx.supabase, ctx.accountId);
    const result = await syncGatewayChatsForSalesMember(
      salesMemberId,
      config.gateway_url,
      config.api_key
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await requireCeo();
    const { searchParams } = new URL(request.url);
    const salesMemberId = searchParams.get('salesMemberId');

    if (!salesMemberId) {
      return NextResponse.json({ error: 'salesMemberId query param required' }, { status: 400 });
    }

    const config = await getGatewayConfig(ctx.supabase, ctx.accountId);
    const result = await syncGatewayChatsForSalesMember(
      salesMemberId,
      config.gateway_url,
      config.api_key
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
