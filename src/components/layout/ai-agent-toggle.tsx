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
      const res = await fetch("/api/whatsapp/ai-agent", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.enabled === "boolean") {
          setEnabled(data.enabled);
          setInitialLoaded(true);
        }
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
        "inline-flex h-9 sm:h-10 min-h-[36px] items-center gap-2 rounded-full px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-white whitespace-nowrap transition-all select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-80 disabled:cursor-not-allowed",
        enabled
          ? "bg-[#25D366] hover:bg-[#20bd5a] focus-visible:ring-[#25D366] shadow-[0_0_0_3px_rgba(37,211,102,0.25)]"
          : "bg-[#DC2626] hover:bg-[#b91c1c] focus-visible:ring-[#DC2626]",
        className
      )}
    >
      <span>{t("label")}</span>

      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-white" />
      ) : (
        <span
          className="text-sm leading-none shrink-0"
          aria-hidden="true"
        >
          {enabled ? "●" : "○"}
        </span>
      )}

      <span className="uppercase tracking-wide font-bold">
        {enabled ? t("on") : t("off")}
      </span>
    </button>
  );
}
