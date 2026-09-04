"use client";

import { useMemo, useState } from "react";
import type { Message } from "@/types";
import { PhoneOutgoing, PhoneIncoming, PhoneMissed, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallMessageChipProps {
  message: Message;
}

export function CallMessageChip({ message }: CallMessageChipProps) {
  const { line1, notesLine, callType } = useMemo(() => {
    const rawText = message.content_text || "";
    const lines = rawText.split("\n");
    let l1 = lines[0] || "";
    // Clean leading emoji if present in line 1 so we render clean lucide icon
    l1 = l1.replace(/^📞\s*/, "");
    const rest = lines.slice(1).join("\n").replace(/^📝\s*/, "");

    let type: "missed" | "incoming" | "callback" | "outgoing" = "outgoing";
    if (/missed/i.test(l1)) {
      type = "missed";
    } else if (/incoming/i.test(l1)) {
      type = "incoming";
    } else if (/callback/i.test(l1)) {
      type = "callback";
    }

    return {
      line1: l1,
      notesLine: rest,
      callType: type,
    };
  }, [message.content_text]);

  const { Icon, iconColorClass, chipBorderClass } = useMemo(() => {
    switch (callType) {
      case "missed":
        return {
          Icon: PhoneMissed,
          iconColorClass: "text-rose-600 dark:text-rose-400 bg-rose-500/15",
          chipBorderClass: "border-rose-500/20 bg-rose-500/5",
        };
      case "incoming":
        return {
          Icon: PhoneIncoming,
          iconColorClass: "text-blue-600 dark:text-blue-400 bg-blue-500/15",
          chipBorderClass: "border-blue-500/20 bg-blue-500/5",
        };
      case "callback":
        return {
          Icon: PhoneCall,
          iconColorClass: "text-amber-600 dark:text-amber-400 bg-amber-500/15",
          chipBorderClass: "border-amber-500/20 bg-amber-500/5",
        };
      case "outgoing":
      default:
        return {
          Icon: PhoneOutgoing,
          iconColorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/15",
          chipBorderClass: "border-emerald-500/20 bg-emerald-500/5",
        };
    }
  }, [callType]);

  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = notesLine.length > 80;

  return (
    <div className="my-2.5 flex w-full flex-col items-center justify-center px-4">
      <div
        className={cn(
          "inline-flex max-w-[90%] flex-col items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs text-foreground bg-card/90 shadow-2xs backdrop-blur-xs transition-colors",
          chipBorderClass,
        )}
      >
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-center font-medium">
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              iconColorClass,
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
          <span className="break-words">{line1}</span>
        </div>
        {notesLine && (
          <div className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground italic px-2">
            <div className="flex items-start gap-1">
              <span className="shrink-0">📝</span>
              <span className="break-words text-center whitespace-pre-wrap">
                {shouldTruncate && !isExpanded ? notesLine.slice(0, 80) + "..." : notesLine}
              </span>
            </div>
            {shouldTruncate && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="font-semibold text-primary hover:underline cursor-pointer not-italic select-none"
              >
                {isExpanded ? "View Less" : "Read More"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
