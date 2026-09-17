import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { syncGatewayChatsForSalesMember } from '@/lib/gateway/sync';

function getEvolutionConfig() {
  const gatewayUrl = process.env.EVOLUTION_API_URL
    ?.trim()
    .replace(/\/+$/, '');

  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!gatewayUrl || !apiKey) {
    throw new Error('Evolution API configuration is missing');
  }

  return {
    gatewayUrl,
    apiKey,
  };
}

export async function POST(request: Request) {
  try {
    await requireCeo();

    const body = await request.json();
    const salesMemberId = body?.salesMemberId;

    if (!salesMemberId) {
      return NextResponse.json(
        { error: 'salesMemberId is required' },
        { status: 400 }
      );
    }

    const { gatewayUrl, apiKey } = getEvolutionConfig();

    const result = await syncGatewayChatsForSalesMember(
      salesMemberId,
      gatewayUrl,
      apiKey
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(request: Request) {
  try {
    await requireCeo();

    const { searchParams } = new URL(request.url);
    const salesMemberId = searchParams.get('salesMemberId');

    if (!salesMemberId) {
      return NextResponse.json(
        { error: 'salesMemberId query param required' },
        { status: 400 }
      );
    }

    const { gatewayUrl, apiKey } = getEvolutionConfig();

    const result = await syncGatewayChatsForSalesMember(
      salesMemberId,
      gatewayUrl,
      apiKey
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}