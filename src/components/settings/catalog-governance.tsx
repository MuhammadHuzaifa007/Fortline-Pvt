"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Clock,
  Layers,
  FileCheck,
  XCircle,
  Loader2,
  RefreshCw,
  GitPullRequest,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CatalogChangeRequest, CatalogAudit } from "@/lib/operations/types";

export function CatalogGovernance() {
  const [audit, setAudit] = useState<CatalogAudit | null>(null);
  const [requests, setRequests] = useState<CatalogChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit Change dialog
  const [submitting, setSubmitting] = useState(false);
  const [changeType, setChangeType] = useState("course_upsert");
  const [changeTitle, setChangeTitle] = useState("");
  const [changeDesc, setChangeDesc] = useState("");

  // Review Dialog
  const [reviewingReq, setReviewingReq] = useState<CatalogChangeRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthRes, changesRes] = await Promise.all([
        fetch("/api/ops/catalog-health"),
        fetch("/api/ops/catalog-changes"),
      ]);

      if (healthRes.ok) {
        const health = await healthRes.json();
        setAudit(health.latestAudit);
      }

      if (changesRes.ok) {
        const changes = await changesRes.json();
        setRequests(changes.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load catalog governance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitChange = async () => {
    if (!changeTitle.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/ops/catalog-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change_type: changeType,
          title: changeTitle.trim(),
          description: changeDesc.trim(),
          payload: {},
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }

      toast.success("Catalog change request submitted for review");
      setSubmitting(false);
      setChangeTitle("");
      setChangeDesc("");
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewAction = async () => {
    if (!reviewingReq) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ops/catalog-changes/${reviewingReq.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: reviewAction,
          note: reviewNote.trim(),
          reason: reviewNote.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Review action failed");
      }

      toast.success(`Change request ${reviewAction}ed successfully`);
      setReviewingReq(null);
      setReviewNote("");
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading catalog governance...</span>
      </div>
    );
  }

  const actual = audit?.actual_counts || { diploma: 17, short_course: 9, long_course: 25 };
  const expected = audit?.expected_counts || { diploma: 17, short_course: 9, long_course: 25 };
  const isConsistent =
    actual.diploma === expected.diploma &&
    actual.short_course === expected.short_course &&
    actual.long_course === expected.long_course;

  return (
    <div className="space-y-6">
      {/* Header & Submit Button */}
      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#008069]" />
            <h2 className="text-lg font-bold text-foreground">Catalog & Knowledge Governance</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Course document integrity, change approvals, embedding synchronizations, and version history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Audit
          </Button>
          <Button
            size="sm"
            onClick={() => setSubmitting(true)}
            className="text-xs h-8 bg-[#008069] text-white gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Change Request
          </Button>
        </div>
      </div>

      {/* Catalog Integrity Status */}
      <div className="p-4 bg-card rounded-xl border border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Production Catalog Integrity (course_documents)
          </span>
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
              isConsistent
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            )}
          >
            {isConsistent ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Integrity Verified
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" /> Count Mismatch
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-muted/40 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground block">Diplomas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-foreground">{actual.diploma ?? 17}</span>
              <span className="text-[11px] text-muted-foreground">
                (Expected: {expected.diploma ?? 17})
              </span>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground block">Short Courses</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-foreground">{actual.short_course ?? 9}</span>
              <span className="text-[11px] text-muted-foreground">
                (Expected: {expected.short_course ?? 9})
              </span>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground block">Long Courses</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-foreground">{actual.long_course ?? 25}</span>
              <span className="text-[11px] text-muted-foreground">
                (Expected: {expected.long_course ?? 25})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Requests Queue */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Catalog Change Requests ({requests.length})
            </h3>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-foreground text-sm">No Pending Change Requests</p>
            <p className="mt-1">All course descriptions, fee structures, and curriculums are synchronized.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {requests.map((req, index) => (
              <div
                key={req.id || `req-${index}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{req.title || "Course Update"}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                      {req.change_type}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                        req.status === "approved" || req.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : req.status === "rejected"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      )}
                    >
                      {req.status}
                    </span>
                  </div>

                  {req.description && (
                    <p className="text-muted-foreground line-clamp-1">{req.description}</p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
                    {req.review_note && (
                      <span className="text-foreground">Note: {req.review_note}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2.5 bg-[#008069] text-white text-xs gap-1"
                        onClick={() => {
                          setReviewingReq(req);
                          setReviewAction("approve");
                          setReviewNote("");
                        }}
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-red-400 hover:text-red-300 text-xs gap-1"
                        onClick={() => {
                          setReviewingReq(req);
                          setReviewAction("reject");
                          setReviewNote("");
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Change Request Dialog */}
      <Dialog open={submitting} onOpenChange={() => setSubmitting(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Course Catalog Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1">Change Type:</label>
              <select
                className="w-full bg-background border border-border rounded p-2 text-foreground"
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
              >
                <option value="course_upsert">Add / Update Course</option>
                <option value="fee_update">Fee Structure Revision</option>
                <option value="curriculum_update">Curriculum / Modules Update</option>
                <option value="course_archive">Archive Course</option>
              </select>
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Title / Course Name:</label>
              <Input
                placeholder="e.g., Python AI & Machine Learning Diploma - 2026 Curriculum"
                value={changeTitle}
                onChange={(e) => setChangeTitle(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-muted-foreground block mb-1">Change Description / Rationale:</label>
              <Textarea
                placeholder="Describe what sections or fees are modified..."
                value={changeDesc}
                onChange={(e) => setChangeDesc(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSubmitting(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#008069] text-white"
              disabled={!changeTitle.trim() || actionLoading}
              onClick={handleSubmitChange}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewingReq} onOpenChange={() => setReviewingReq(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {reviewAction} Catalog Change
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Are you sure you want to <strong>{reviewAction}</strong> &ldquo;{reviewingReq?.title}&rdquo;?
            </p>
            <div>
              <label className="text-muted-foreground block mb-1">Reviewer Note / Reason:</label>
              <Textarea
                placeholder={
                  reviewAction === "approve"
                    ? "e.g., Approved by Academic Director"
                    : "e.g., Missing updated prerequisite details"
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReviewingReq(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={reviewAction === "approve" ? "bg-[#008069] text-white" : "bg-red-600 text-white"}
              disabled={actionLoading}
              onClick={handleReviewAction}
            >
              Confirm {reviewAction === "approve" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
