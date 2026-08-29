import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadEnrollmentApplications } from "@/lib/operations/queries";

export async function GET(request: Request) {
  try {
    // Admissions viewing requires at least admin role
    await requireRole("admin");

    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get("paymentStatus") || undefined;
    const applicationStatus = searchParams.get("applicationStatus") || undefined;
    const program = searchParams.get("program") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);

    const result = await loadEnrollmentApplications(
      {
        paymentStatus: paymentStatus ? paymentStatus.split(",") : undefined,
        applicationStatus,
        program,
      },
      { page, pageSize }
    );

    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
