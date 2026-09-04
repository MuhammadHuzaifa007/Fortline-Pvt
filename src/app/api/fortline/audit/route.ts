import { NextRequest, NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireCeo();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const { data, error } = await ctx.supabase
      .from('fortline_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Fortline Audit GET Error]:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      audit_events: data || [],
      user_id: ctx.userId,
    });
  } catch (err: unknown) {
    return toErrorResponse(err);
  }
}
