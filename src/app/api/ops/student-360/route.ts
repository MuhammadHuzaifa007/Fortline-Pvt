import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/flows/admin-client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await getCurrentAccount();
    const phone = req.nextUrl.searchParams.get("phone");
    if (!phone) {
      return NextResponse.json({ student: null });
    }
    const db = supabaseAdmin();
    const { data } = await db
      .from("itechskill_student_360")
      .select("lead_band, lead_score, selected_program_name, selected_program_type, lifecycle_stage")
      .eq("phone", phone)
      .maybeSingle();

    return NextResponse.json({ student: data ?? null });
  } catch (err) {
    return toErrorResponse(err);
  }
}
