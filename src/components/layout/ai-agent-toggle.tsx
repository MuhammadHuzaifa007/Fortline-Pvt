"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function AiAgentToggle({ className }: { className?: string }) {
  const t = useTranslations("AiAgentToggle");
  const [enabled, setEnabled] = useState<boolean>(true);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Fetch status on mount and periodically poll (every 20s)
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/ai-agent", { 
        cache: "no-store",
        credentials: "same-origin"
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.enabled === "boolean") {
          setEnabled(data.enabled);
          setInitialLoaded(true);
        }
      } else if (res.status === 401) {
        // Session expired, stop polling or reload to force login
        window.location.reload();
      }
    } catch {
      // Non-fatal background fetch error
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleToggle = () => {
    if (isPending) return;

    const nextState = !enabled;

    startTransition(async () => {
      try {
        const res = await fetch("/api/whatsapp/ai-agent", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ enabled: nextState }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || t("toastFailed"));
        }

        const data = await res.json();
        setEnabled(data.enabled);

        if (data.enabled) {
          toast.success(t("toastOn"));
        } else {
          toast.error(t("toastOff"));
        }
      } catch (err: any) {
        toast.error(err.message || t("toastFailed"));
      }
    });
  };

  const title = enabled ? t("tooltipOn") : t("tooltipOff");
  const ariaLabel = enabled ? t("ariaOn") : t("ariaOff");

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending || !initialLoaded}
      aria-label={ariaLabel}
      aria-pressed={enabled}
      title={title}
      className={cn(
        "inline-flex h-7 sm:h-8 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-80 disabled:cursor-not-allowed shadow-sm active:scale-95",
        enabled
          ? "bg-[#008069] hover:bg-[#006d59] text-white focus-visible:ring-[#008069]"
          : "bg-muted/80 hover:bg-muted text-muted-foreground border border-border focus-visible:ring-border",
        className
      )}
    >
      <span>{t("label")}</span>

      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            enabled ? "bg-white" : "bg-muted-foreground/60"
          )}
          aria-hidden="true"
        />
      )}

      <span className="uppercase tracking-wider font-bold text-[10px] sm:text-[11px]">
        {enabled ? t("on") : t("off")}
      </span>
    </button>
  );
}
