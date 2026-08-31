import { NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { loadHotLeadPhones } from "@/lib/operations/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getCurrentAccount();
    const phones = await loadHotLeadPhones();
    return NextResponse.json({ phones });
  } catch (err) {
    return toErrorResponse(err);
  }
}
