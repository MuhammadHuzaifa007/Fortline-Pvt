import { NextResponse } from 'next/server';
import { requireCeo, toErrorResponse } from '@/lib/auth/fortline-auth';

export async function GET(request: Request) {
  try {
    const ctx = await requireCeo();
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 30;

    // Pull recent inbound & outbound messages with sales member and contact info
    const { data: messages, error } = await ctx.supabase
      .from('messages')
      .select(`
        id, created_at, sender_type, content_type, content_text, status,
        channel_phone_number_id,
        sales_member:fortline_sales_members(id, name, division),
        conversation:conversations(
          id,
          contact:contacts(id, name, phone, company)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const feed = (messages ?? []).map((m: any) => ({
      id: m.id,
      timestamp: m.created_at,
      senderType: m.sender_type,
      contentType: m.content_type,
      text: m.content_text,
      status: m.status,
      channelId: m.channel_phone_number_id,
      salesMember: m.sales_member,
      contact: m.conversation?.contact,
    }));

    return NextResponse.json(feed);
  } catch (err) {
    return toErrorResponse(err);
  }
}
