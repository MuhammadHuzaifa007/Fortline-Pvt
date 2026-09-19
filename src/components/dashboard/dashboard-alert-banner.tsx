"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  QrCode,
  Radio,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import type { FortlineSalesMember } from "@/types/fortline";

interface DashboardAlertBannerProps {
  salesMembers: FortlineSalesMember[];
}

export function DashboardAlertBanner({ salesMembers }: DashboardAlertBannerProps) {
  // Filter for members with disconnected channel status
  const disconnectedReps = salesMembers.filter(
    (m) => m.channel_connection_status === "disconnected"
  );

  if (disconnectedReps.length === 0) {
    return null;
  }

  // Segregate confirmed logouts (401) from temporary network timeouts (408)
  const confirmedLogouts = disconnectedReps.filter(
    (m) => m.channel_disconnect_classification === "confirmed_logout"
  );
  const temporaryTimeouts = disconnectedReps.filter(
    (m) =>
      m.channel_disconnect_classification === "temporary_timeout" ||
      m.channel_last_disconnect_code === 408
  );
  const otherDisconnects = disconnectedReps.filter(
    (m) =>
      m.channel_disconnect_classification !== "confirmed_logout" &&
      m.channel_disconnect_classification !== "temporary_timeout" &&
      m.channel_last_disconnect_code !== 408
  );

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* 1. CRITICAL: Confirmed Logouts / Device Unlinked (Status 401) */}
      {confirmedLogouts.map((rep) => (
        <div
          key={`logout_${rep.id}`}
          className="rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-rose-950/30 to-rose-500/10 p-4 shadow-[0_0_15px_rgba(244,63,94,0.15)] backdrop-blur-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0 mt-0.5 sm:mt-0">
                <AlertOctagon className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-rose-200 text-sm tracking-wide">
                    CRITICAL: WhatsApp Device Unlinked (Status 401: Logged Out)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Confirmed Logout
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                  Sales member <strong className="text-white font-semibold">{rep.name}</strong>{" "}
                  ({rep.whatsapp_phone_number || rep.phone_number}) was logged out or explicitly unlinked their
                  device from WhatsApp. Client messages will not sync until re-linked.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Link
                href="/settings?tab=sales-members"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <QrCode className="size-3.5" />
                <span>Re-pair Device (QR)</span>
              </Link>
              <Link
                href="/notifications"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition-colors"
              >
                <ExternalLink className="size-3.5" />
                <span>Audit</span>
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* 2. WARNING: Temporary Socket / Network Timeouts (Status 408) */}
      {temporaryTimeouts.map((rep) => (
        <div
          key={`timeout_${rep.id}`}
          className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-950/30 to-amber-500/10 p-4 shadow-[0_0_15px_rgba(245,158,11,0.12)] backdrop-blur-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                <Radio className="size-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-200 text-sm tracking-wide">
                    NOTICE: Temporary Connection Interruption (Status 408: Network Timeout)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <RotateCw className="size-2.5 animate-spin" />
                    Automatic Reconnection
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  Temporary socket timeout detected on <strong className="text-white font-semibold">{rep.name}</strong>{" "}
                  ({rep.whatsapp_phone_number || rep.phone_number}). Session credentials remain active on gateway;
                  automatic reconnection is in progress.{" "}
                  <span className="italic text-amber-300 font-medium">
                    (Do not assume phone is offline or manually logged out).
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Link
                href="/settings?tab=sales-members"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold shadow-xs transition-colors"
              >
                <Radio className="size-3.5" />
                <span>Check Live Socket</span>
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* 3. Other / Generic Disconnects */}
      {otherDisconnects.map((rep) => (
        <div
          key={`other_${rep.id}`}
          className="rounded-xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-foreground text-sm tracking-wide">
                    WhatsApp Channel Offline
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                    Session Disconnected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Channel for <strong className="text-foreground">{rep.name}</strong>{" "}
                  ({rep.whatsapp_phone_number || rep.phone_number}) is currently disconnected:{" "}
                  {rep.channel_last_disconnect_reason || "Socket closed by gateway."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Link
                href="/settings?tab=sales-members"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition-colors"
              >
                <QrCode className="size-3.5" />
                <span>View Channel</span>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
