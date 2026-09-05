"use client";

import { cn } from "@/lib/utils";
import type { Message, MessageReaction } from "@/types";
import {
  Clock,
  Check,
  CheckCheck,
  XCircle,
  MapPin,
  LayoutTemplate,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ReplyQuote } from "./reply-quote";
import { MessageReactions } from "./message-reactions";
import {
  MediaAudioBubble,
  MediaDocumentBubble,
  MediaImageBubble,
  MediaUnavailable,
  MediaVideoBubble,
} from "./message-media";
import { InteractivePreview } from "@/components/interactive/interactive-preview";
import { useTranslations } from "next-intl";

interface MessageBubbleProps {
  message: Message;
  /** Pre-computed quote info for messages that reply to another. */
  reply?: { authorLabel: string; preview: string } | null;
  reactions?: MessageReaction[];
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
  /**
   * Opens the thread's media viewer on this message. Only images and videos
   * call it; omitted when the parent renders no viewer, in which case media
   * stays inline and non-clickable.
   */
  onOpenMedia?: (messageId: string) => void;
}

function StatusIcon({ status }: { status: Message["status"] }) {
  switch (status) {
    case "sending":
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-400" />;
    default:
      return null;
  }
}

function FormattedMessageText({
  text,
  isAgent,
}: {
  text: string;
  isAgent: boolean;
}) {
  if (!text) return null;

  // Regex to match URLs (http://, https://, or www.)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return (
    <span className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          const href =
            part.startsWith("http://") || part.startsWith("https://")
              ? part
              : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "underline underline-offset-2 font-medium transition-opacity",
                isAgent
                  ? "text-white underline decoration-white/60 hover:text-white/80"
                  : "text-[#00a884] dark:text-[#00a884] underline decoration-[#00a884]/60 hover:text-[#008069]"
              )}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}

function MessageContent({
  message,
  t,
  onOpenMedia,
  isAgent,
}: {
  message: Message;
  t: ReturnType<typeof useTranslations>;
  onOpenMedia?: (messageId: string) => void;
  isAgent: boolean;
}) {
  // Passed to the media bubbles as a no-arg callback; `undefined` when the
  // parent wired up no viewer, which is what makes them non-clickable.
  const openMedia = onOpenMedia ? () => onOpenMedia(message.id) : undefined;

  const effectiveText =
    message.content_text || (message as any).content || "";
  const effectiveType =
    message.content_type ||
    (message.media_url ? ((message as any).media_type || "image") : "text");

  switch (effectiveType) {
    case "text":
      return (
        <FormattedMessageText
          text={effectiveText}
          isAgent={isAgent}
        />
      );

    case "image":
      return (
        <div>
          {message.media_url ? (
            <MediaImageBubble message={message} onOpen={openMedia} t={t} />
          ) : (
            <MediaUnavailable label={t("photo")} t={t} />
          )}
          {effectiveText && (
            <div className="mt-1">
              <FormattedMessageText
                text={effectiveText}
                isAgent={isAgent}
              />
            </div>
          )}
        </div>
      );

    case "video":
      return (
        <div>
          {message.media_url ? (
            <MediaVideoBubble message={message} onOpen={openMedia} t={t} />
          ) : (
            <MediaUnavailable label={t("video")} t={t} />
          )}
          {effectiveText && (
            <div className="mt-1">
              <FormattedMessageText
                text={effectiveText}
                isAgent={isAgent}
              />
            </div>
          )}
        </div>
      );

    case "audio":
      return (
        <div>
          {message.media_url ? (
            <MediaAudioBubble message={message} t={t} />
          ) : (
            <MediaUnavailable label={t("audio")} t={t} />
          )}
        </div>
      );

    case "document":
      if (!message.media_url) {
        return <MediaUnavailable label={effectiveText || t("document")} t={t} />;
      }
      return <MediaDocumentBubble message={message} t={t} />;

    case "template":
      return (
        <div>
          <span className="mb-1 inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <LayoutTemplate className="h-3 w-3" />
            {t("template")}
          </span>
          {effectiveText && (
            <div className="mt-1">
              <FormattedMessageText
                text={effectiveText}
                isAgent={isAgent}
              />
            </div>
          )}
        </div>
      );

    case "location":
      return (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{effectiveText || t("locationShared")}</span>
        </div>
      );

    case "interactive": {
      if (message.interactive_payload) {
        return <InteractivePreview payload={message.interactive_payload} />;
      }
      if (message.sender_type === "customer" || (message.sender_type as string) === "contact") {
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <CornerDownLeft className="h-3 w-3" />
              {t("buttonReply")}
            </span>
            <FormattedMessageText
              text={effectiveText || t("interactiveReply")}
              isAgent={isAgent}
            />
          </div>
        );
      }
      return (
        <FormattedMessageText
          text={effectiveText || t("interactiveReply")}
          isAgent={isAgent}
        />
      );
    }

    case "call":
      return (
        <FormattedMessageText
          text={effectiveText}
          isAgent={isAgent}
        />
      );

    default:
      return (
        <FormattedMessageText
          text={effectiveText || t("unsupported")}
          isAgent={isAgent}
        />
      );
  }
}

export function MessageBubble({
  message,
  reply,
  reactions,
  currentUserId,
  onToggleReaction,
  onOpenMedia,
}: MessageBubbleProps) {
  const t = useTranslations("Inbox.bubble");

  const isAgent =
    message.sender_type === "agent" ||
    message.sender_type === "bot" ||
    (message.sender_type as string) === "user";
  const time = format(new Date(message.created_at), "HH:mm");
  const isEdited = Boolean(
    (message.interactive_payload as unknown as Record<string, unknown> | null)?.is_edited ||
    (message as unknown as Record<string, unknown>).is_edited
  );

  // Row alignment + width cap are owned by <MessageActions> so its hover
  // group matches the bubble's content area, not the full row.
  return (
    <div
      className={cn(
        "flex flex-col",
        isAgent ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "relative rounded-2xl px-3 py-2 shadow-sm",
          isAgent
            ? "rounded-br-md bg-[#008069] dark:bg-[#005c4b] text-white"
            : "rounded-bl-md bg-muted dark:bg-[#202c33] text-foreground",
        )}
      >
        {reply && (
          <ReplyQuote
            authorLabel={reply.authorLabel}
            preview={reply.preview}
            onPrimary={isAgent}
          />
        )}
        <MessageContent
          message={message}
          t={t}
          onOpenMedia={onOpenMedia}
          isAgent={isAgent}
        />
        <div
          className={cn(
            "mt-1 flex items-center gap-1",
            isAgent ? "justify-end" : "justify-start",
          )}
        >
          {/* AI badge */}
          {message.ai_generated && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-px text-[9px] font-semibold uppercase leading-none tracking-wide text-primary-foreground"
              title={t("aiBadgeTitle")}
            >
              <Sparkles className="h-2.5 w-2.5" />
              {t("aiBadge")}
            </span>
          )}
          {isEdited && (
            <span
              className={cn(
                "text-[9px] italic opacity-80",
                isAgent ? "text-white/80" : "text-muted-foreground"
              )}
            >
              (edited)
            </span>
          )}
          <span
            className={cn(
              "text-[10px]",
              isAgent ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {time}
          </span>
          {isAgent && <StatusIcon status={message.status} />}
        </div>
      </div>
      {reactions && reactions.length > 0 && onToggleReaction && (
        <MessageReactions
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={onToggleReaction}
        />
      )}
    </div>
  );
}
