import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';
import { loadDashboardSummary, loadExceptions, loadSalesMembers } from '@/lib/fortline/queries';
import type { FortlineDashboardResponse, FortlineActivityItem } from '@/types/fortline';

export async function GET(request: Request) {
  try {
    const ctx = await requireCeo();
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range');
    const rangeDays = rangeParam === 'today' || rangeParam === '1' ? 1 : rangeParam === '7d' || rangeParam === '7' ? 7 : 30;

    const [kpis, exceptions, salesMembersResult] = await Promise.all([
      loadDashboardSummary(ctx.supabase, ctx.accountId, rangeDays),
      loadExceptions(ctx.supabase, ctx.accountId),
      loadSalesMembers(ctx.supabase, ctx.accountId),
    ]);

    // Query recent WhatsApp activities (inbound & outbound)
    const { data: recentMsgs } = await ctx.supabase
      .from('messages')
      .select(`
        id, created_at, content_text, sender_type,
        conversation:conversations(
          id,
          contact:contacts(name, phone),
          sales_member:fortline_sales_members(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentActivity: FortlineActivityItem[] = (recentMsgs || []).map((msg: any) => ({
      id: msg.id,
      type: msg.sender_type === 'customer' ? 'inbound_message' : 'outbound_message',
      title: msg.sender_type === 'customer' ? 'Client Inquiry' : 'Rep Response',
      description: msg.content_text || 'Media attachment',
      timestamp: msg.created_at,
      sales_member_name: msg.conversation?.sales_member?.name || null,
      contact_name: msg.conversation?.contact?.name || null,
      contact_phone: msg.conversation?.contact?.phone || null,
      direction: msg.sender_type === 'customer' ? 'inbound' : 'outbound',
    }));

    const divisions = [
      'Enterprise Servers',
      'Laptops & Fleet',
      'Hardware & Components',
      'Data Center Services',
      'IT Managed Services',
    ];

    const response: FortlineDashboardResponse = {
      kpis,
      exceptions,
      recentActivity,
      salesMembers: salesMembersResult.members,
      divisions,
    };

    return NextResponse.json(response);
  } catch (err) {
    return toErrorResponse(err);
  }
}
