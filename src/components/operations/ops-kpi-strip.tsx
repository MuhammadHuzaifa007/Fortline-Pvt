"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  AlertTriangle,
  Flame,
  Clock,
  CreditCard,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperationsSummary } from "@/lib/operations/types";

export function OpsKpiStrip() {
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/ops/summary");
        if (!res.ok) return;
        const data = await res.json();
        if (active) setSummary(data);
      } catch (err) {
        console.error("[OpsKpiStrip] fetch error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border/50 bg-card/50 p-3"
          />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const items = [
    {
      label: "Open Handoffs",
      value: summary.openHandoffs,
      href: "/inbox?tab=handoffs",
      icon: UserCheck,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      highlight: summary.openHandoffs > 0,
    },
    {
      label: "Overdue SLA",
      value: summary.overdueHandoffs,
      href: "/inbox?tab=handoffs&overdue=true",
      icon: AlertTriangle,
      color:
        summary.overdueHandoffs > 0
          ? "text-red-400 bg-red-500/10 border-red-500/30 animate-pulse"
          : "text-muted-foreground bg-muted/40 border-border/50",
      highlight: summary.overdueHandoffs > 0,
    },
    {
      label: "Hot Leads",
      value: summary.hotLeads,
      href: "/inbox?filter=hot",
      icon: Flame,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      highlight: summary.hotLeads > 0,
    },
    {
      label: "Pending Followups",
      value: summary.pendingFollowups,
      href: "/automations?tab=followups",
      icon: Clock,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      highlight: summary.pendingFollowups > 0,
    },
    {
      label: "Verify Payments",
      value: summary.pendingPayments,
      href: "/admissions",
      icon: CreditCard,
      color:
        summary.pendingPayments > 0
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
          : "text-muted-foreground bg-muted/40 border-border/50",
      highlight: summary.pendingPayments > 0,
    },
    {
      label: "AI Pass Rate",
      value:
        summary.aiPassRate !== null
          ? `${Math.round(summary.aiPassRate * 100)}%`
          : "N/A",
      href: "/agents?tab=health",
      icon: ShieldCheck,
      color:
        summary.aiPassRate !== null && summary.aiPassRate >= 0.95
          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
          : "text-amber-400 bg-amber-500/10 border-amber-500/20",
      highlight: false,
    },
    {
      label: "Incidents",
      value: summary.activeIncidents,
      href: "/settings?tab=operations",
      icon: Activity,
      color:
        summary.activeIncidents > 0
          ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
          : "text-muted-foreground bg-muted/40 border-border/50",
      highlight: summary.activeIncidents > 0,
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operations Live Pulse (n8n Engine)
        </h2>
        <span className="flex items-center gap-1.5 text-[11px] text-[#008069]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#008069] animate-pulse" />
          Realtime Sync
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border p-3 transition-all hover:scale-[1.02] hover:shadow-md",
              item.color
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground/80 truncate">
                {item.label}
              </span>
              <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-bold tracking-tight text-foreground">
                {item.value}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
