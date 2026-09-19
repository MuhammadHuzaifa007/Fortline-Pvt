"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  ImageOff,
  Loader2,
  Maximize2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { downloadMediaMessage } from "@/lib/media/download";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { resolveDisplayMediaUrl } from "@/lib/media/blob-cache";

/**
 * The media renderers behind `<MessageBubble>`'s image / video / audio /
 * document cases. Split out of message-bubble.tsx so that file stays a
 * thin content switch — everything here is about the two affordances
 * issue #373 asked for: open it full-size, and save it.
 *
 * Both are less trivial than they look, because the two flavours of
 * `media_url` behave differently in the browser. See
 * `@/lib/media/blob-cache` for the proxy-vs-bucket split and
 * `@/lib/media/download` for why `<a download>` alone isn't enough.
 */

type Translator = ReturnType<typeof useTranslations>;

/** Inline media size cap, shared so the four bubbles can't drift apart. */
const MEDIA_BOX = "max-h-72 w-full max-w-[240px] sm:max-w-[280px]";

export function MediaUnavailable({
  label,
  t,
}: {
  label: string;
  t: Translator;
}) {
  return (
    <div className="flex w-[220px] sm:w-[260px] max-w-full items-center gap-2.5 rounded-xl bg-black/15 dark:bg-black/30 px-3.5 py-3 text-xs text-muted-foreground">
      <ImageOff className="h-5 w-5 shrink-0 text-muted-foreground/80" />
      <span className="truncate">{t("unavailable", { label })}</span>
    </div>
  );
}

/**
 * Kicks off a download and reports failure as a toast. Kept as a hook so
 * each bubble owns its own in-flight state — a slow 16 MB video shouldn't
 * put a spinner on every other attachment in the thread.
 */
function useMediaDownload(message: Message, t: Translator) {
  const [downloading, setDownloading] = useState(false);

  const download = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadMediaMessage(message);
    } catch {
      toast.error(t("downloadFailed"));
    } finally {
      setDownloading(false);
    }
  }, [downloading, message, t]);

  return { downloading, download };
}

function MediaActionButton({
  icon: Icon,
  label,
  onClick,
  busy = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      // Own surface rather than inheriting the bubble's, so the same button
      // reads on the muted inbound fill, the primary outbound fill, and on
      // top of an arbitrary photo.
      className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function MediaPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-48 w-[240px] sm:w-[280px] max-w-full items-center justify-center rounded-xl bg-black/15 dark:bg-black/30 text-muted-foreground">
      {children}
    </div>
  );
}

export function MediaImageBubble({
  message,
  onOpen,
  t,
}: {
  message: Message;
  /** Opens the thread's lightbox on this message. Omitted ⇒ not clickable. */
  onOpen?: () => void;
  t: Translator;
}) {
  const displayUrl = resolveDisplayMediaUrl(message);
  const { src, status } = useMediaBlobUrl(displayUrl);
  // The fetch can succeed and the bytes still not be a decodable image.
  const [broken, setBroken] = useState(false);
  const { downloading, download } = useMediaDownload(message, t);

  if (status === "error" || broken) {
    return (
      <MediaPlaceholder>
        <div className="flex flex-col items-center gap-1.5 p-3 text-center">
          <ImageOff className="h-7 w-7 text-muted-foreground/70" />
          <span className="text-[11px] text-muted-foreground/80">{t("unavailable", { label: t("photo") })}</span>
        </div>
      </MediaPlaceholder>
    );
  }

  if (status !== "ready" || !src) {
    return (
      <MediaPlaceholder>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-[11px] text-muted-foreground/70">Loading photo...</span>
        </div>
      </MediaPlaceholder>
    );
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={t("imageAlt")}
      className="block h-auto max-h-[360px] min-h-[140px] w-full rounded-xl object-cover transition-transform duration-150 active:scale-[0.99]"
      onError={() => setBroken(true)}
    />
  );

  return (
    <div className="group/media relative w-[240px] sm:w-[280px] max-w-full overflow-hidden rounded-xl bg-black/10">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("viewImage")}
          className="block w-full cursor-zoom-in rounded-xl outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-ring"
        >
          {image}
        </button>
      ) : (
        image
      )}
      {/* Hover-only: on touch there is no hover, but tapping the image opens
          the viewer, which carries a full-size Download button. */}
      <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover/media:opacity-100 group-focus-within/media:opacity-100">
        <MediaActionButton
          icon={Download}
          label={t("download")}
          onClick={download}
          busy={downloading}
        />
      </div>
    </div>
  );
}

export function MediaVideoBubble({
  message,
  onOpen,
  t,
}: {
  message: Message;
  onOpen?: () => void;
  t: Translator;
}) {
  const { downloading, download } = useMediaDownload(message, t);

  // Always route through the gateway proxy — raw WhatsApp CDN URLs
  // (https://mmg.whatsapp.net/...) are encrypted and inaccessible to
  // browsers. The proxy decrypts via Evolution API and supports Range
  // requests for seeking.
  const displayUrl = resolveDisplayMediaUrl(message);
  const { src, status } = useMediaBlobUrl(displayUrl);

  if (!displayUrl) {
    return <MediaUnavailable label={t("video")} t={t} />;
  }

  if (status === "error") {
    return (
      <MediaPlaceholder>
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </MediaPlaceholder>
    );
  }

  if (status !== "ready" || !src) {
    return (
      <MediaPlaceholder>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </MediaPlaceholder>
    );
  }

  return (
    <div className="relative w-fit">
      <video
        src={src}
        controls
        preload="metadata"
        className={cn(MEDIA_BOX, "rounded-lg")}
      />
      {/* Top-right, clear of the native controls — and always visible, since
          expanding is the only way to watch a clip capped at 15rem wide and
          a touch device gets no hover. */}
      <div className="absolute right-2 top-2 flex gap-1">
        {onOpen && (
          <MediaActionButton
            icon={Maximize2}
            label={t("expandVideo")}
            onClick={onOpen}
          />
        )}
        <MediaActionButton
          icon={Download}
          label={t("download")}
          onClick={download}
          busy={downloading}
        />
      </div>
    </div>
  );
}

export function MediaAudioBubble({
  message,
  t,
}: {
  message: Message;
  t: Translator;
}) {
  const { downloading, download } = useMediaDownload(message, t);

  // --- Blob loading for proxied (inbound) voice messages ---
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const displayUrl = resolveDisplayMediaUrl(message);

  useEffect(() => {
    const url = displayUrl;
    if (!url) return;

    // Public bucket URLs can be used directly; proxied ones need blob loading
    if (!url.startsWith("/api/whatsapp/media/") && !url.startsWith("/api/gateway/media/")) {
      setBlobUrl(url);
      setLoadStatus("ready");
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoadStatus("loading");

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoadStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("error");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [displayUrl]);

  // --- Playback state ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  }, [playing]);

  const handleTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (el) setCurrentTime(el.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const el = audioRef.current;
    if (el && isFinite(el.duration)) setDuration(el.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setCurrentTime(0);
    const el = audioRef.current;
    if (el) el.currentTime = 0;
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const val = parseFloat(e.target.value);
    el.currentTime = val;
    setCurrentTime(val);
  }, []);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate deterministic "waveform" bars from message id
  const bars = useMemo(() => {
    const seed = message.id || "default";
    const result: number[] = [];
    for (let i = 0; i < 28; i++) {
      const code = seed.charCodeAt(i % seed.length) || 42;
      result.push(0.2 + ((code * (i + 1) * 7) % 100) / 125);
    }
    return result;
  }, [message.id]);

  if (!displayUrl) {
    return <MediaUnavailable label={t("audio")} t={t} />;
  }

  if (loadStatus === "loading") {
    return (
      <div className="flex w-full max-w-56 items-center gap-2 rounded-lg px-1 py-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-muted-foreground">Loading voice…</span>
      </div>
    );
  }

  if (loadStatus === "error") {
    return <MediaUnavailable label={t("audio")} t={t} />;
  }

  return (
    <div className="flex w-full max-w-64 items-center gap-2 py-1">
      {/* Hidden audio element */}
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onDurationChange={handleLoadedMetadata}
        />
      )}

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="3.5" height="12" rx="1" />
            <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <path d="M3 1.5v11l9-5.5z" />
          </svg>
        )}
      </button>

      {/* Waveform + seek area */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Waveform visualization */}
        <div className="relative flex h-7 items-end gap-[1.5px]">
          {bars.map((h, i) => {
            const barPercent = ((i + 1) / bars.length) * 100;
            const isPlayed = barPercent <= progress;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-colors duration-75"
                style={{
                  height: `${h * 100}%`,
                  minHeight: 3,
                  backgroundColor: isPlayed
                    ? "var(--color-primary, #00a884)"
                    : "var(--color-muted-foreground, #8696a0)",
                  opacity: isPlayed ? 1 : 0.4,
                }}
              />
            );
          })}
          {/* Invisible range input overlaid for seeking */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Seek"
          />
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{fmtTime(currentTime)}</span>
          <span>{duration > 0 ? fmtTime(duration) : "—"}</span>
        </div>
      </div>

      {/* Download button */}
      <MediaActionButton
        icon={Download}
        label={t("download")}
        onClick={download}
        busy={downloading}
      />
    </div>
  );
}

export function MediaDocumentBubble({
  message,
  t,
}: {
  message: Message;
  t: Translator;
}) {
  const { downloading, download } = useMediaDownload(message, t);

  const displayUrl = resolveDisplayMediaUrl(message);

  if (!displayUrl) {
    return <MediaUnavailable label={t("document")} t={t} />;
  }

  return (
    <div className="flex w-full max-w-64 items-center gap-2">
      <a
        href={displayUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
      >
        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="truncate">{message.content_text || t("document")}</span>
      </a>
      <MediaActionButton
        icon={Download}
        label={t("download")}
        onClick={download}
        busy={downloading}
      />
    </div>
  );
}
