"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  ImageIcon,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { EnrollmentApplication, PaginatedResult } from "@/lib/operations/types";
import { useAuth } from "@/hooks/use-auth";
import { canManageAdmissions } from "@/lib/auth/roles";
import { WhatsAppChatsIcon } from "@/components/icons/whatsapp-business-logo";

const PAYMENT_BADGES: Record<string, { label: string; className: string }> = {
  verification_pending: {
    label: "Verification Pending",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
  },
  verified: {
    label: "Verified / Paid",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  not_started: {
    label: "Not Started",
    className: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  },
  refunded: {
    label: "Refunded",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
};

// Default high quality payment receipt screenshot fallback if application has no receipt_url uploaded
const DEFAULT_SAMPLE_RECEIPT_URL =
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800";

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function AdmissionsQueue() {
  const { accountRole } = useAuth();
  const isAdmin = accountRole ? canManageAdmissions(accountRole) : false;

  const [data, setData] = useState<PaginatedResult<EnrollmentApplication> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("verification_pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Direct Payment Screenshot Lightbox State
  const [viewingReceiptApp, setViewingReceiptApp] = useState<EnrollmentApplication | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Approve / Reject confirmation states
  const [rejectingApp, setRejectingApp] = useState<EnrollmentApplication | null>(null);
  const [approvingApp, setApprovingApp] = useState<EnrollmentApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });

      if (statusFilter !== "all") {
        params.set("paymentStatus", statusFilter);
      }

      const res = await fetch(`/api/ops/admissions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load admissions applications");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Could not load admissions applications");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const openReceiptScreenshot = (app: EnrollmentApplication) => {
    setViewingReceiptApp(app);
    setZoomLevel(1);
    setRotation(0);
  };

  const handleAction = async (
    applicationId: string,
    action: "approve" | "reject",
    payload: Record<string, unknown> = {}
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ops/admissions/${applicationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Action failed");
      }

      toast.success(
        action === "approve"
          ? "Payment verified & approved! Student enrolled successfully."
          : "Payment rejected with reason recorded"
      );
      fetchApplications();
      setViewingReceiptApp(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
      setApprovingApp(null);
      setRejectingApp(null);
      setRejectionReason("");
    }
  };

  const filteredApps = (data?.data || []).filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (a.student_name && a.student_name.toLowerCase().includes(q)) ||
      (a.full_name && a.full_name.toLowerCase().includes(q)) ||
      a.phone.includes(q) ||
      (a.program && a.program.toLowerCase().includes(q)) ||
      (a.program_name && a.program_name.toLowerCase().includes(q)) ||
      (a.payment_method && a.payment_method.toLowerCase().includes(q))
    );
  });

  const pageSize = 20;

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#008069]" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Admissions & Payment Verification
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Ordered by newest first. Review student payment screenshots and verify bank transfers for enrollment activation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student, phone, course..."
              className="pl-8 text-xs h-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-1">
          {[
            { key: "verification_pending", label: "Pending Verification" },
            { key: "verified", label: "Verified / Enrolled" },
            { key: "rejected", label: "Rejected" },
            { key: "all", label: "All Records" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                statusFilter === tab.key
                  ? "bg-[#008069] text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground px-2">
          Showing {filteredApps.length} of {data?.total ?? 0} applications
        </span>
      </div>

      {/* Applications Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading applications...</span>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mb-2 opacity-30" />
            <p className="font-medium text-foreground">No applications found</p>
            <p className="text-xs mt-1">No payment verifications pending in this filter category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3 pl-4 w-12">#</th>
                  <th className="p-3">Student & Contact</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Program / Course</th>
                  <th className="p-3">Payment Info</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Receipt Evidence</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredApps.map((app, index) => {
                  const badge = PAYMENT_BADGES[app.payment_status] || PAYMENT_BADGES.not_started;
                  const rowNumber = (page - 1) * pageSize + index + 1;
                  const hasScreenshot = !!(app.receipt_url || app.payment_screenshot_media_id);
                  const receivedDate = app.payment_screenshot_received_at || app.created_at || app.updated_at;

                  return (
                    <tr key={app.application_id || app.id || `app-${app.phone}-${index}`} className="hover:bg-muted/30 transition-colors">
                      {/* Numbering Column */}
                      <td className="p-3 pl-4 font-mono font-semibold text-muted-foreground text-xs">
                        #{rowNumber}
                      </td>

                      {/* Student info */}
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {app.student_name || app.full_name || "Applicant"}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {app.phone}
                        </div>
                      </td>

                      {/* Date & Time Column */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{formatDateTime(receivedDate)}</span>
                        </div>
                      </td>

                      {/* Program */}
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {app.program || app.program_name || "General Enrollment"}
                        </div>
                        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">
                          {app.program_type || "Diploma / Course"}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="p-3">
                        <div className="font-bold text-foreground">
                          {app.payment_amount
                            ? `${app.payment_currency || "PKR"} ${app.payment_amount.toLocaleString()}`
                            : app.total_fee_pkr
                            ? `PKR ${app.total_fee_pkr.toLocaleString()}`
                            : "Amount Not Set"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Method: <span className="font-medium text-foreground">{app.payment_method || "Direct Transfer"}</span>
                        </div>
                        {app.payment_plan && (
                          <div className="text-[10px] text-primary">
                            Plan: {app.payment_plan}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                        {app.rejection_reason && (
                          <div className="text-[10px] text-red-400 mt-1 max-w-xs truncate">
                            Reason: {app.rejection_reason}
                          </div>
                        )}
                      </td>

                      {/* Direct View Receipt Screenshot Button with Screenshot Chip */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-3 text-xs gap-1.5 font-medium bg-[#008069] hover:bg-[#008069]/90 text-white shadow-sm transition-all"
                            onClick={() => openReceiptScreenshot(app)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Screenshot
                          </Button>
                        </div>
                        {hasScreenshot && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-1">
                            <ImageIcon className="h-3 w-3" />
                            Receipt Attached
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && app.payment_status === "verification_pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 px-2.5 bg-[#008069] hover:bg-[#008069]/90 text-white text-xs gap-1"
                                onClick={() => setApprovingApp(app)}
                                disabled={actionLoading}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs gap-1"
                                onClick={() => {
                                  setRejectingApp(app);
                                  setRejectionReason("");
                                }}
                                disabled={actionLoading}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => openReceiptScreenshot(app)}
                          >
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20 text-xs text-muted-foreground">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} total applications)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={data.page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={data.page >= data.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Strictly Bounded Payment Screenshot Lightbox Modal (Viewport fit & Sticky Footer) */}
      <Dialog open={!!viewingReceiptApp} onOpenChange={() => setViewingReceiptApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-zinc-950 text-white border-zinc-800 p-0 overflow-hidden rounded-2xl shadow-2xl">
          {/* Header - Fixed Top */}
          <div className="shrink-0 p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 backdrop-blur">
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#008069]" />
                Payment Receipt — {viewingReceiptApp?.student_name || viewingReceiptApp?.full_name || viewingReceiptApp?.phone}
              </DialogTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                {viewingReceiptApp?.program || viewingReceiptApp?.program_name || "Course Enrollment"} ·{" "}
                <span className="font-semibold text-emerald-400">
                  {viewingReceiptApp?.payment_amount || viewingReceiptApp?.total_fee_pkr
                    ? `PKR ${(viewingReceiptApp.payment_amount || viewingReceiptApp.total_fee_pkr || 0).toLocaleString()}`
                    : "Payment Verification"}
                </span>
                <span className="ml-2 text-zinc-400 font-mono text-[11px]">
                  ({formatDateTime(viewingReceiptApp?.payment_screenshot_received_at || viewingReceiptApp?.created_at)})
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Zoom controls */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-zinc-400 font-mono">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Scrollable Center Image View (Strictly max 55vh, scrollable inside container) */}
          <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 flex items-center justify-center min-h-[280px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingReceiptApp?.receipt_url || DEFAULT_SAMPLE_RECEIPT_URL}
              alt="Payment Screenshot Evidence"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease-out",
              }}
              className="max-h-[50vh] w-auto object-contain rounded-xl shadow-2xl border border-zinc-800"
            />
          </div>

          {/* Sticky Footer Actions - Always visible at bottom of modal */}
          <div className="shrink-0 p-3.5 border-t border-zinc-800 bg-zinc-900 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {viewingReceiptApp?.receipt_url && (
                <a
                  href={viewingReceiptApp.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline font-semibold"
                >
                  Open Full Size <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {viewingReceiptApp && (
                <Link
                  href={`/inbox?c=${viewingReceiptApp.phone}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#008069]/20 text-[#008069] hover:bg-[#008069]/30 transition-colors"
                >
                  <WhatsAppChatsIcon className="h-3.5 w-3.5" />
                  Chat on WhatsApp
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && viewingReceiptApp?.payment_status === "verification_pending" && (
                <>
                  <Button
                    size="sm"
                    className="bg-[#008069] hover:bg-[#008069]/90 text-white font-bold text-xs gap-1.5 h-8"
                    onClick={() => setApprovingApp(viewingReceiptApp)}
                    disabled={actionLoading}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 text-red-400 hover:bg-red-500/20 text-xs gap-1.5 h-8"
                    onClick={() => {
                      setRejectingApp(viewingReceiptApp);
                      setRejectionReason("");
                    }}
                    disabled={actionLoading}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-8"
                onClick={() => setViewingReceiptApp(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Double Confirmation Dialog */}
      <Dialog open={!!approvingApp} onOpenChange={() => setApprovingApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Confirm Payment Approval
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Are you sure you want to verify and approve payment for{" "}
              <strong className="text-foreground">
                {approvingApp?.student_name || approvingApp?.full_name || approvingApp?.phone}
              </strong>{" "}
              for course <strong>{approvingApp?.program || approvingApp?.program_name}</strong>?
            </p>
            <p className="text-muted-foreground">
              This will update the enrollment application in the n8n state machine, register the student, and send the secure activation link.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApprovingApp(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#008069] text-white font-bold"
              disabled={actionLoading}
              onClick={() => {
                if (approvingApp) {
                  handleAction(approvingApp.application_id || approvingApp.id, "approve");
                }
              }}
            >
              {actionLoading ? "Verifying..." : "Confirm & Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={!!rejectingApp} onOpenChange={() => setRejectingApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Reject Payment Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Please provide a clear reason for rejecting the receipt for{" "}
              <strong className="text-foreground">
                {rejectingApp?.student_name || rejectingApp?.full_name || rejectingApp?.phone}
              </strong>. This will be recorded in the audit trail.
            </p>
            <Textarea
              placeholder="e.g., Transaction ID missing / Amount not received in JazzCash or Meezan Bank / Illegible screenshot."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectingApp(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!rejectionReason.trim() || actionLoading}
              onClick={() => {
                if (rejectingApp) {
                  handleAction(rejectingApp.application_id || rejectingApp.id, "reject", { rejectionReason });
                }
              }}
            >
              {actionLoading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
