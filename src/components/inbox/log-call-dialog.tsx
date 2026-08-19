"use client";

import { useState, useCallback, useEffect, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneOutgoing, PhoneIncoming, PhoneMissed, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { CallDirection, CallMethod, CallOutcome } from "@/types";

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  conversationId?: string | null;
  onCallLogged?: () => void;
}

const PRESET_DURATIONS = [
  { label: "0:30", seconds: 30 },
  { label: "1:00", seconds: 60 },
  { label: "3:00", seconds: 180 },
  { label: "5:00", seconds: 300 },
  { label: "10:00", seconds: 600 },
];

function formatSecondsToMMSS(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function parseMMSSToSeconds(str: string): number {
  const cleaned = str.trim();
  if (!cleaned) return 0;
  if (!cleaned.includes(":")) {
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : Math.max(0, num);
  }
  const parts = cleaned.split(":");
  const mins = parseInt(parts[0], 10) || 0;
  const secs = parseInt(parts[1], 10) || 0;
  return Math.max(0, mins * 60 + secs);
}

export function LogCallDialog({
  open,
  onOpenChange,
  contactId,
  conversationId,
  onCallLogged,
}: LogCallDialogProps) {
  const t = useTranslations("Calls");
  const directionId = useId();
  const methodId = useId();
  const durationId = useId();
  const outcomeId = useId();
  const notesId = useId();
  const followUpId = useId();

  const [direction, setDirection] = useState<CallDirection>("outgoing");
  const [callMethod, setCallMethod] = useState<CallMethod>("phone");
  const [durationText, setDurationText] = useState("0:00");
  const [outcome, setOutcome] = useState<CallOutcome>("answered");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDirection("outgoing");
      setCallMethod("phone");
      setDurationText("0:00");
      setOutcome("answered");
      setNotes("");
      setFollowUpAt("");
      setSubmitting(false);
    }
  }, [open]);

  // Handle direction change: when Missed, force duration to 0:00
  const handleDirectionChange = useCallback((newDir: CallDirection) => {
    setDirection(newDir);
    if (newDir === "missed") {
      setDurationText("0:00");
      setOutcome("no_answer");
    } else {
      if (outcome === "no_answer") {
        setOutcome("answered");
      }
    }
  }, [outcome]);

  // Format mm:ss as user types numeric input
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9:]/g, "");
    setDurationText(raw);
  }, []);

  const handleDurationBlur = useCallback(() => {
    const secs = parseMMSSToSeconds(durationText);
    setDurationText(formatSecondsToMMSS(secs));
  }, [durationText]);

  const handleApplyPreset = useCallback((presetSecs: number) => {
    if (direction === "missed") return;
    setDurationText(formatSecondsToMMSS(presetSecs));
  }, [direction]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || submitting) return;

    const finalDuration = direction === "missed" ? 0 : parseMMSSToSeconds(durationText);

    setSubmitting(true);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          conversation_id: conversationId || null,
          direction,
          call_method: callMethod,
          duration_seconds: finalDuration,
          outcome,
          notes: notes.trim(),
          follow_up_at: followUpAt ? new Date(followUpAt).toISOString() : null,
          call_started_at: new Date().toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg = data?.error || `HTTP ${res.status}`;
        toast.error(`${t("toasts.callLogFailed")}: ${errMsg}`);
        return;
      }

      toast.success(t("toasts.callLogged"));
      onOpenChange(false);
      if (onCallLogged) {
        onCallLogged();
      }
    } catch (err) {
      console.error("Failed to log call:", err);
      const msg = err instanceof Error ? err.message : "network error";
      toast.error(`${t("toasts.callLogFailed")}: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }, [
    contactId,
    conversationId,
    direction,
    callMethod,
    durationText,
    outcome,
    notes,
    followUpAt,
    submitting,
    onOpenChange,
    onCallLogged,
    t,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Phone className="h-5 w-5 text-primary" />
            {t("logCallTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Direction Segmented Control */}
          <div className="space-y-1.5">
            <Label htmlFor={directionId} className="text-xs font-semibold text-foreground">
              {t("direction")}
            </Label>
            <div id={directionId} className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDirectionChange("outgoing")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  direction === "outgoing"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                <PhoneOutgoing className="h-3.5 w-3.5" />
                {t("directions.outgoing")}
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange("incoming")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  direction === "incoming"
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                <PhoneIncoming className="h-3.5 w-3.5" />
                {t("directions.incoming")}
              </button>
              <button
                type="button"
                onClick={() => handleDirectionChange("missed")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${
                  direction === "missed"
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                <PhoneMissed className="h-3.5 w-3.5" />
                {t("directions.missed")}
              </button>
            </div>
          </div>

          {/* Call Method */}
          <div className="space-y-1.5">
            <Label htmlFor={methodId} className="text-xs font-semibold text-foreground">
              {t("method")}
            </Label>
            <Select
              value={callMethod}
              onValueChange={(val) => setCallMethod(val as CallMethod)}
            >
              <SelectTrigger id={methodId} className="w-full">
                <SelectValue placeholder={t("method")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">{t("methods.phone")}</SelectItem>
                <SelectItem value="whatsapp">{t("methods.whatsapp")}</SelectItem>
                <SelectItem value="other">{t("methods.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration & Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={durationId} className="text-xs font-semibold text-foreground">
                {t("duration")}
              </Label>
              {direction === "missed" && (
                <span className="text-[11px] text-muted-foreground italic">
                  {t("directions.missed")} (0:00)
                </span>
              )}
            </div>
            <Input
              id={durationId}
              type="text"
              value={durationText}
              onChange={handleDurationChange}
              onBlur={handleDurationBlur}
              disabled={direction === "missed"}
              placeholder="0:00"
              className="font-mono text-sm"
            />
            {direction !== "missed" && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground mr-1">
                  {t("quickPresets")}:
                </span>
                {PRESET_DURATIONS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset.seconds)}
                    className="rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <Label htmlFor={outcomeId} className="text-xs font-semibold text-foreground">
              {t("outcome")}
            </Label>
            <Select
              value={outcome}
              onValueChange={(val) => setOutcome(val as CallOutcome)}
            >
              <SelectTrigger id={outcomeId} className="w-full">
                <SelectValue placeholder={t("outcome")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="answered">{t("outcomes.answered")}</SelectItem>
                <SelectItem value="no_answer">{t("outcomes.no_answer")}</SelectItem>
                <SelectItem value="busy">{t("outcomes.busy")}</SelectItem>
                <SelectItem value="callback_scheduled">
                  {t("outcomes.callback_scheduled")}
                </SelectItem>
                <SelectItem value="not_reachable">
                  {t("outcomes.not_reachable")}
                </SelectItem>
                <SelectItem value="wrong_number">
                  {t("outcomes.wrong_number")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor={notesId} className="text-xs font-semibold text-foreground">
              {t("notes")}
            </Label>
            <Textarea
              id={notesId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={1000}
              rows={3}
              className="resize-none text-xs"
            />
            <div className="text-right text-[10px] text-muted-foreground">
              {notes.length}/1000
            </div>
          </div>

          {/* Optional Follow-up */}
          {(outcome === "callback_scheduled" || outcome === "no_answer") && (
            <div className="space-y-1.5">
              <Label htmlFor={followUpId} className="text-xs font-semibold text-foreground">
                {t("followUp")}
              </Label>
              <Input
                id={followUpId}
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? t("saving") : t("saveCall")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
