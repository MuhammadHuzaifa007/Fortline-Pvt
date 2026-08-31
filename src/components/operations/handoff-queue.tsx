"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Play,
  UserPlus,
  Search,
  Filter,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { WhatsAppChatsIcon } from "@/components/icons/whatsapp-business-logo";
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
import type { HandoffCase, PaginatedResult } from "@/lib/operations/types";
import { useAuth } from "@/hooks/use-auth";

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  high: { label: "High", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  normal: { label: "Normal", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  low: { label: "Low", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  in_progress: { label: "In Progress", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  waiting_staff: { label: "Waiting Staff", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  resolved: { label: "Resolved", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

interface HandoffQueueProps {
  onSelectConversation?: (phone: string) => void;
}

export function HandoffQueue({ onSelectConversation }: HandoffQueueProps) {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResult<HandoffCase> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog states
  const [resolvingCase, setResolvingCase] = useState<HandoffCase | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [assigningCase, setAssigningCase] = useState<HandoffCase | null>(null);
  const [staffInput, setStaffInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchHandoffs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });

      if (statusFilter === "active") {
        params.set("status", "open,in_progress,waiting_staff");
      } else if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (priorityFilter !== "all") {
        params.set("priority", priorityFilter);
      }

      if (overdueOnly) {
        params.set("overdue", "true");
      }

      const res = await fetch(`/api/ops/handoffs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch handoffs");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Could not load handoff cases");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, overdueOnly]);

  useEffect(() => {
    fetchHandoffs();
  }, [fetchHandoffs]);

  const handleAction = async (caseId: string, action: string, payload: Record<string, unknown> = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ops/handoffs/${caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Action failed");
      }
      toast.success(`Handoff case ${action}ed successfully`);
      fetchHandoffs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
      setResolvingCase(null);
      setAssigningCase(null);
      setResolutionNote("");
      setStaffInput("");
    }
  };

  const isOverdue = (slaDueAt: string | null, status: string) => {
    if (!slaDueAt || status === "resolved" || status === "cancelled") return false;
    return new Date(slaDueAt).getTime() < Date.now();
  };

  const filteredCases = (data?.data || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.student_name && c.student_name.toLowerCase().includes(q)) ||
      c.phone.includes(q) ||
      (c.category && c.category.toLowerCase().includes(q)) ||
      (c.reason && c.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-b border-border space-y-3 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#008069]" />
            <h2 className="text-lg font-bold text-foreground">Human Handoff Queue</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {data?.total ?? 0} cases
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, reason..."
                className="pl-8 text-xs h-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant={overdueOnly ? "destructive" : "outline"}
              size="sm"
              className="text-xs h-9 gap-1.5"
              onClick={() => {
                setOverdueOnly(!overdueOnly);
                setPage(1);
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Overdue SLA
            </Button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1">
            {[
              { key: "active", label: "Active" },
              { key: "open", label: "Open" },
              { key: "in_progress", label: "In Progress" },
              { key: "resolved", label: "Resolved" },
              { key: "all", label: "All" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                  statusFilter === tab.key
                    ? "bg-[#008069] text-white"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              className="text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases List / Table */}
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading handoff cases...</span>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <UserCheck className="h-10 w-10 mb-2 opacity-30" />
            <p className="font-medium text-foreground">No handoff cases match the filters</p>
            <p className="text-xs mt-1">All conversations are handled or no SLA is pending.</p>
          </div>
        ) : (
          filteredCases.map((c, index) => {
            const priorityBadge = PRIORITY_BADGES[c.priority] || PRIORITY_BADGES.normal;
            const statusBadge = STATUS_BADGES[c.status] || STATUS_BADGES.open;
            const overdue = isOverdue(c.sla_due_at, c.status);

            return (
              <div
                key={c.id || `handoff-${c.phone}-${index}`}
                className={cn(
                  "p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  overdue && "bg-red-500/[0.03] border-l-4 border-l-red-500"
                )}
              >
                {/* Left: Contact info & context */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">
                      {c.student_name || "Unknown Student"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {c.phone}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                        priorityBadge.className
                      )}
                    >
                      {priorityBadge.label}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        statusBadge.className
                      )}
                    >
                      {statusBadge.label}
                    </span>
                    {overdue && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                        OVERDUE SLA
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-foreground/90 font-medium">
                    <span className="text-muted-foreground font-normal">Reason: </span>
                    {c.reason || c.category || "General Inquiry"}
                  </div>

                  {c.conversation_context && (
                    <p className="text-xs text-muted-foreground line-clamp-1 italic bg-background/50 p-1.5 rounded border border-border/40">
                      &ldquo;{c.conversation_context}&rdquo;
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                    <span>Created: {new Date(c.created_at).toLocaleString()}</span>
                    {c.sla_due_at && (
                      <span className={cn(overdue && "text-red-400 font-semibold")}>
                        SLA Due: {new Date(c.sla_due_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span>Assigned: {c.assigned_to ? "Staff Member" : "Unassigned"}</span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {onSelectConversation && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => onSelectConversation(c.phone)}
                    >
                      <WhatsAppChatsIcon className="h-3.5 w-3.5" />
                      Chat
                    </Button>
                  )}

                  {c.status === "open" && (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs h-8 bg-[#008069] hover:bg-[#008069]/90 text-white gap-1"
                      onClick={() => handleAction(c.case_id || c.id, "start")}
                      disabled={actionLoading}
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </Button>
                  )}

                  {c.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-emerald-400 hover:text-emerald-300 gap-1"
                      onClick={() => setResolvingCase(c)}
                      disabled={actionLoading}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolve
                    </Button>
                  )}

                  {c.status === "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1"
                      onClick={() => handleAction(c.id, "reopen")}
                      disabled={actionLoading}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reopen
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      setAssigningCase(c);
                      setStaffInput(user?.id || "");
                    }}
                    disabled={actionLoading}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {data && data.totalPages > 1 && (
        <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20 text-xs text-muted-foreground">
          <span>
            Page {data.page} of {data.totalPages} ({data.total} total cases)
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

      {/* Resolve Dialog */}
      <Dialog open={!!resolvingCase} onOpenChange={() => setResolvingCase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Handoff Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Please enter a brief note explaining how this case was resolved for student{" "}
              <strong>{resolvingCase?.student_name || resolvingCase?.phone}</strong>.
            </p>
            <Textarea
              placeholder="e.g., Answered fee structure inquiry and scheduled campus visit."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResolvingCase(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#008069] text-white"
              disabled={!resolutionNote.trim() || actionLoading}
              onClick={() => {
                if (resolvingCase) {
                  handleAction(resolvingCase.id, "resolve", { resolutionNote });
                }
              }}
            >
              Confirm Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assigningCase} onOpenChange={() => setAssigningCase(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Handoff Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              Assign case to staff member ID or email:
            </p>
            <Input
              placeholder="Enter Staff User ID"
              value={staffInput}
              onChange={(e) => setStaffInput(e.target.value)}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssigningCase(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#008069] text-white"
              disabled={!staffInput.trim() || actionLoading}
              onClick={() => {
                if (assigningCase) {
                  handleAction(assigningCase.id, "assign", { staffUserId: staffInput.trim() });
                }
              }}
            >
              Assign Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
