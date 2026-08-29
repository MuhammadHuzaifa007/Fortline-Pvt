"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Ban,
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
import type { FollowupJob, PaginatedResult } from "@/lib/operations/types";
import { useAuth } from "@/hooks/use-auth";
import { canManageOperations } from "@/lib/auth/roles";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending (Scheduled)",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  claimed: {
    label: "Claimed (In-Flight)",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
  },
  sent: {
    label: "Sent Successfully",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  },
  failed: {
    label: "Failed (Retrying)",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  dead_letter: {
    label: "Dead Letter",
    className: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
};

export function FollowupQueue() {
  const { accountRole } = useAuth();
  const isAdmin = accountRole ? canManageOperations(accountRole) : false;

  const [data, setData] = useState<PaginatedResult<FollowupJob> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Cancel dialog
  const [cancellingJob, setCancellingJob] = useState<FollowupJob | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "25",
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/ops/followups?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load follow-up jobs");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Could not load follow-up jobs");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCancelJob = async () => {
    if (!cancellingJob || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ops/followups/${cancellingJob.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to cancel follow-up");
      }

      toast.success("Follow-up cancelled and audit log recorded");
      setCancellingJob(null);
      setCancelReason("");
      fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredJobs = (data?.data || []).filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (j.student_name && j.student_name.toLowerCase().includes(q)) ||
      j.phone.includes(q) ||
      (j.program && j.program.toLowerCase().includes(q)) ||
      (j.template_name && j.template_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-1">
          {[
            { key: "pending", label: "Pending Scheduled" },
            { key: "claimed", label: "Claimed / In-Flight" },
            { key: "sent", label: "Sent" },
            { key: "cancelled", label: "Cancelled" },
            { key: "failed", label: "Failed" },
            { key: "all", label: "All Jobs" },
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

        <div className="relative w-60">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student, phone, template..."
            className="pl-8 text-xs h-8 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading follow-up jobs...</span>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Clock className="h-10 w-10 mb-2 opacity-30" />
            <p className="font-medium text-foreground">No follow-up jobs in this category</p>
            <p className="text-xs mt-1">Scheduled follow-up workers in n8n run periodically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="p-3 pl-4">Student</th>
                  <th className="p-3">Program & Template</th>
                  <th className="p-3">Due / Scheduled At</th>
                  <th className="p-3">Status & Attempts</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredJobs.map((job, index) => {
                  const badge = STATUS_BADGES[job.status] || STATUS_BADGES.pending;

                  return (
                    <tr key={job.id || `job-${job.phone}-${index}`} className="hover:bg-muted/30 transition-colors">
                      {/* Student */}
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-foreground">
                          {job.student_name || "Lead / Student"}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {job.phone}
                        </div>
                      </td>

                      {/* Program & Template */}
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {job.program || "iTechSkill Course"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Template: <span className="font-mono">{job.template_name || "followup_default"}</span>
                          {job.template_language && ` (${job.template_language})`}
                        </div>
                      </td>

                      {/* Due Time */}
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {job.due_at ? new Date(job.due_at).toLocaleString() : "Immediate"}
                        </div>
                        {job.sent_at && (
                          <div className="text-[10px] text-emerald-400">
                            Delivered: {new Date(job.sent_at).toLocaleString()}
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
                        {job.attempt_count > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-2">
                            Attempts: {job.attempt_count}
                          </span>
                        )}
                        {job.last_error && (
                          <div className="text-[10px] text-red-400 mt-1 max-w-xs truncate">
                            Error: {job.last_error}
                          </div>
                        )}
                        {job.cancellation_reason && (
                          <div className="text-[10px] text-zinc-400 mt-1 max-w-xs truncate">
                            Cancelled: {job.cancellation_reason}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 pr-4 text-right">
                        {isAdmin && job.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs gap-1"
                            onClick={() => {
                              setCancellingJob(job);
                              setCancelReason("");
                            }}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        )}
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
              Page {data.page} of {data.totalPages} ({data.total} total jobs)
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancellingJob} onOpenChange={() => setCancellingJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Ban className="h-5 w-5" />
              Cancel Scheduled Follow-Up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Are you sure you want to cancel the scheduled follow-up for{" "}
              <strong className="text-foreground">
                {cancellingJob?.student_name || cancellingJob?.phone}
              </strong>?
            </p>
            <Textarea
              placeholder="Please provide a cancellation reason (e.g. Student enrolled already / Opted out / Converted over phone call)."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancellingJob(null)}>
              Keep Scheduled
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!cancelReason.trim() || actionLoading}
              onClick={handleCancelJob}
            >
              {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
