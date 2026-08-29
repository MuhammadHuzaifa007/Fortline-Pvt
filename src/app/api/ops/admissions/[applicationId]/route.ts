import { NextResponse } from "next/server";
import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { loadApplicationById } from "@/lib/operations/queries";
import {
  approvePayment,
  rejectPayment,
  updatePaymentReceiptDetails,
} from "@/lib/operations/actions";

interface RouteParams {
  params: Promise<{ applicationId: string }>;
}

export async function GET(request: Request, props: RouteParams) {
  try {
    await requireRole("admin");
    const { applicationId } = await props.params;

    const application = await loadApplicationById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: "Enrollment application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(application);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request, props: RouteParams) {
  try {
    const ctx = await requireRole("admin");
    const { applicationId } = await props.params;

    const body = await request.json().catch(() => ({}));
    const {
      action,
      rejectionReason,
      receiptUrl,
      beneficiaryAccount,
      paymentAmount,
      paymentMethod,
      metadata,
      requestId,
    } = body;

    const actor = { userId: ctx.userId, role: ctx.role };

    switch (action) {
      case "approve": {
        const updated = await approvePayment(applicationId, actor, requestId);
        return NextResponse.json(updated);
      }

      case "reject": {
        if (!rejectionReason || typeof rejectionReason !== "string" || !rejectionReason.trim()) {
          return NextResponse.json(
            { error: "A rejection reason is required to reject a payment" },
            { status: 400 }
          );
        }
        const updated = await rejectPayment(
          applicationId,
          rejectionReason.trim(),
          actor,
          requestId
        );
        return NextResponse.json(updated);
      }

      case "update_receipt": {
        const updated = await updatePaymentReceiptDetails(
          applicationId,
          {
            receipt_url: receiptUrl,
            beneficiary_account: beneficiaryAccount,
            payment_amount: paymentAmount,
            payment_method: paymentMethod,
            receipt_metadata: metadata,
          },
          actor,
          requestId
        );
        return NextResponse.json(updated);
      }

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Expected approve | reject | update_receipt` },
          { status: 400 }
        );
    }
  } catch (err) {
    return toErrorResponse(err);
  }
}
