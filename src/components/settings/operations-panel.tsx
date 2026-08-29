"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
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
import type { OperationsAlert, PaginatedResult } from "@/lib/operations/types";

const SEVERITY_BADGES: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-red-500/15 text-red-400 border-red-500/30 animate-pulse" },
  high: { label: "High", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  normal: { label: "Normal", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  low: { label: "Low", className: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

export function OperationsPanel() {
  const [data, setData] = useState<PaginatedResult<OperationsAlert> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Resolve dialog
  const [resolvingAlert, setResolvingAlert] = useState<OperationsAlert | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "25",
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      if (severityFilter !== "all") {
        params.set("severity", severityFilter);
      }

      const res = await fetch(`/api/ops/incidents?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load operations incidents");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Could not load incidents list");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, severityFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleResolve = async () => {
    if (!resolvingAlert) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ops/incidents/${resolvingAlert.fingerprint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNote: resolutionNote.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to resolve incident");
      }

      toast.success("Incident resolved and recovery recorded");
      setResolvingAlert(null);
      setResolutionNote("");
      fetchIncidents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAlerts = (data?.data || []).filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.alert_type.toLowerCase().includes(q) ||
      a.fingerprint.toLowerCase().includes(q) ||
      (a.resolution_note && a.resolution_note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-[#008069]" />
          <h2 className="text-lg font-bold text-foreground">Production Operations & Incidents</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Automated production health monitoring alerts, provider failure logs, and recovery audit history.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-card rounded-xl border border-border">
        <div className="flex items-center gap-1">
          {[
            { key: "pending", label: "Active Incidents" },
            { key: "resolved", label: "Resolved" },
            { key: "all", label: "All Telemetry" },
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

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="text-xs bg-background border border-border rounded-md px-2 py-1 text-foreground"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Severities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading operations incidents...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <ShieldCheck className="h-10 w-10 mb-2 text-emerald-400" />
            <p className="font-semibold text-foreground text-sm">System Healthy</p>
            <p className="text-xs mt-1">No active production incidents or alerts detected.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAlerts.map((alert, index) => {
              const severityBadge = SEVERITY_BADGES[alert.severity] || SEVERITY_BADGES.normal;
              const isResolved = alert.status === "resolved";

              return (
                <div
                  key={alert.id || alert.fingerprint || `alert-${index}`}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground capitalize">
                        {alert.alert_type.replace("_", " ")}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          severityBadge.className
                        )}
                      >
                        {severityBadge.label}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        )}
                      >
                        {alert.status}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-muted-foreground">
                      Fingerprint: {alert.fingerprint}
                    </div>

                    {alert.details && (
                      <pre className="p-2 bg-muted/40 rounded border border-border text-[11px] text-foreground/90 font-mono overflow-x-auto">
                        {JSON.stringify(alert.details, null, 2)}
                      </pre>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                      <span>First Seen: {new Date(alert.first_seen_at).toLocaleString()}</span>
                      <span>Last Seen: {new Date(alert.last_seen_at).toLocaleString()}</span>
                      {alert.resolved_at && (
                        <span className="text-emerald-400">
                          Resolved: {new Date(alert.resolved_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isResolved && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 px-2.5 bg-[#008069] text-white text-xs gap-1"
                        onClick={() => {
                          setResolvingAlert(alert);
                          setResolutionNote("");
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve Incident
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between bg-muted/20 text-xs text-muted-foreground">
            <span>
              Page {data.page} of {data.totalPages} ({data.total} total alerts)
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

      {/* Resolve Dialog */}
      <Dialog open={!!resolvingAlert} onOpenChange={() => setResolvingAlert(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Resolve Operational Incident
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              Please enter an operational resolution note for incident{" "}
              <strong className="text-foreground">{resolvingAlert?.alert_type}</strong>:
            </p>
            <Textarea
              placeholder="e.g., WhatsApp Cloud API webhook rate-limit cleared; queue re-drained."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResolvingAlert(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-[#008069] text-white"
              disabled={actionLoading}
              onClick={handleResolve}
            >
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
