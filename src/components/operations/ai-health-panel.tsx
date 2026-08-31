"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Cpu,
  GitBranch,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AiHealthData } from "@/lib/operations/queries";

export function AiHealthPanel() {
  const [data, setData] = useState<AiHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ops/ai-health");
      if (!res.ok) throw new Error("Failed to load AI health data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Could not load AI health metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading AI health & regression telemetry...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-border">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
        <p>No regression runs or telemetry records found.</p>
      </div>
    );
  }

  const run = data.latestRun;
  const rawPassRate = run?.pass_rate ?? 1;
  const normalizedRate = rawPassRate > 1 ? rawPassRate / 100 : rawPassRate;
  const passRatePct = Math.round(normalizedRate * 100);
  const isHealthy = run ? run.status === "passed" && normalizedRate >= 0.95 : true;

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-6 w-6 text-amber-400" />
            )}
            <h2 className="text-lg font-bold text-foreground">AI Health & Regression Suite</h2>
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-semibold rounded-full border",
                isHealthy
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              )}
            >
              {isHealthy ? "Healthy" : "Needs Attention"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Automated production regression results, route accuracy, and fallback telemetry.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          className="text-xs h-8 gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Regression Run Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pass Rate */}
        <div className="p-4 bg-card rounded-xl border border-border space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Regression Pass Rate</span>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-3xl font-extrabold tracking-tight",
                isHealthy ? "text-emerald-400" : "text-amber-400"
              )}
            >
              {run?.pass_rate !== null && run?.pass_rate !== undefined
                ? `${passRatePct}%`
                : "100%"}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Target: &gt;95%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isHealthy ? "bg-emerald-500" : "bg-amber-500"
              )}
              style={{ width: `${passRatePct}%` }}
            />
          </div>
        </div>

        {/* Test Cases Count */}
        <div className="p-4 bg-card rounded-xl border border-border space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Evaluation Cases</span>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {run?.total_cases ?? 0}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> {run?.passed_cases ?? 0} Passed
            </span>
            <span className="flex items-center gap-1 text-red-400 font-medium">
              <XCircle className="h-3.5 w-3.5" /> {run?.failed_cases ?? 0} Failed
            </span>
          </div>
        </div>

        {/* AI Fallbacks (24h) */}
        <div className="p-4 bg-card rounded-xl border border-border space-y-2">
          <span className="text-xs font-medium text-muted-foreground">AI Fallbacks (24h)</span>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {data.aiFallbackCount}
          </div>
          <span className="text-xs text-muted-foreground">
            Fallback replies triggered by AI error
          </span>
        </div>

        {/* Routing Failures (24h) */}
        <div className="p-4 bg-card rounded-xl border border-border space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Routing Failures (24h)</span>
          <div className="text-3xl font-extrabold text-foreground tracking-tight">
            {data.routingFailures}
          </div>
          <span className="text-xs text-muted-foreground">
            Inbound messages misclassified or unrouted
          </span>
        </div>
      </div>

      {/* Version Telemetry */}
      {run && (
        <div className="p-4 bg-card rounded-xl border border-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block">Model Version:</span>
            <div className="flex items-center gap-1 mt-0.5 font-mono font-medium text-foreground">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              {run.model_version || "gpt-4o-mini"}
            </div>
          </div>

          <div>
            <span className="text-muted-foreground block">Prompt Version:</span>
            <div className="flex items-center gap-1 mt-0.5 font-mono font-medium text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              {run.prompt_version || "advisor_v2.4"}
            </div>
          </div>

          <div>
            <span className="text-muted-foreground block">Workflow Version:</span>
            <div className="flex items-center gap-1 mt-0.5 font-mono font-medium text-foreground">
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              {run.workflow_version || "21-08-2026"}
            </div>
          </div>

          <div>
            <span className="text-muted-foreground block">Last Evaluated:</span>
            <div className="flex items-center gap-1 mt-0.5 text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {run.completed_at ? new Date(run.completed_at).toLocaleString() : "Running"}
            </div>
          </div>
        </div>
      )}

      {/* Failed Critical Cases Breakdown */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-foreground">
              Regression Case Failures ({data.failedCritical.length + data.recentFailures.length})
            </h3>
          </div>
        </div>

        {data.failedCritical.length === 0 && data.recentFailures.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
            <p className="font-semibold text-foreground text-sm">All Regression Cases Passed</p>
            <p className="mt-1">All student advisor routing, fee citations, and RAG assertions match ground truth.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[...data.failedCritical, ...data.recentFailures].map((res, i) => (
              <div key={res.id || `eval-case-${res.case_id || i}-${i}`} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {res.case_name || `Case #${res.case_id || i + 1}`}
                    </span>
                    {res.is_critical && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <span className="text-red-400 font-medium">Failed</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded border border-border text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Expected Route: </span>
                    <span className="font-mono text-foreground font-semibold">
                      {res.expected_route || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual Route: </span>
                    <span className="font-mono text-red-400 font-semibold">
                      {res.actual_route || "N/A"}
                    </span>
                  </div>
                </div>

                {res.error && (
                  <p className="text-[11px] text-red-400/90 font-mono bg-red-500/10 p-2 rounded border border-red-500/20">
                    {res.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
