"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { PhoneCall, RefreshCw, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PresenceDot } from "@/components/presence/presence-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "./skeleton";
import type { AgentCallStats } from "@/types";
import { cn } from "@/lib/utils";

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0s";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function TeamCallsCard() {
  const t = useTranslations("Calls.teamMonitoring");
  const { accountRole, profileLoading } = useAuth();
  const [stats, setStats] = useState<AgentCallStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnerOrAdmin = accountRole === "owner" || accountRole === "admin";

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/account/call-stats");
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          setStats(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setStats(data.stats ?? []);
    } catch (err) {
      console.error("[TeamCallsCard] fetch error:", err);
      setStats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading && isOwnerOrAdmin) {
      fetchStats();
    } else if (!profileLoading && !isOwnerOrAdmin) {
      setLoading(false);
    }
  }, [profileLoading, isOwnerOrAdmin, fetchStats]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetchStats();
  }, [refreshing, fetchStats]);

  // Hidden entirely for non-admin/owner roles
  if (!profileLoading && !isOwnerOrAdmin) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PhoneCall className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          aria-label={t("refresh")}
          title={t("refresh")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : !stats || stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{t("noCalls")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs">{t("agent")}</TableHead>
                  <TableHead className="text-xs">{t("role")}</TableHead>
                  <TableHead className="text-right text-xs">{t("totalCalls")}</TableHead>
                  <TableHead className="text-right text-xs">{t("answered")}</TableHead>
                  <TableHead className="text-right text-xs">{t("missedUnanswered")}</TableHead>
                  <TableHead className="text-right text-xs">{t("avgDuration")}</TableHead>
                  <TableHead className="text-right text-xs">{t("totalTalkTime")}</TableHead>
                  <TableHead className="text-right text-xs">{t("calls24h")}</TableHead>
                  <TableHead className="text-right text-xs">{t("lastCall")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((agent) => (
                  <TableRow key={agent.user_id} className="border-border hover:bg-muted/40">
                    {/* Agent Name + Presence */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <PresenceDot
                          status={agent.presence}
                          label={t(
                            agent.presence === "online"
                              ? "presenceOnline"
                              : agent.presence === "away"
                              ? "presenceAway"
                              : "presenceOffline",
                          )}
                        />
                        <span className="truncate text-xs text-foreground">
                          {agent.agent_name}
                        </span>
                      </div>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono tracking-wider"
                      >
                        {agent.account_role}
                      </Badge>
                    </TableCell>

                    {/* Total Calls */}
                    <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                      {agent.total_calls.toLocaleString()}
                    </TableCell>

                    {/* Answered */}
                    <TableCell className="text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                      {agent.answered_calls.toLocaleString()}
                    </TableCell>

                    {/* Missed / Unanswered */}
                    <TableCell className="text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                      {agent.unanswered_calls.toLocaleString()}
                    </TableCell>

                    {/* Avg Duration */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatDuration(agent.avg_call_seconds)}
                    </TableCell>

                    {/* Total Talk Time */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatDuration(agent.total_talk_seconds)}
                    </TableCell>

                    {/* Calls (24h) */}
                    <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                      {agent.calls_last_24h.toLocaleString()}
                    </TableCell>

                    {/* Last Call */}
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(agent.last_call_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
