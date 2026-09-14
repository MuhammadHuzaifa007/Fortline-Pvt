"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CONVERSATION_SELECT,
  CONVERSATION_BASE_SELECT,
  matchesContactFilters,
  normalizeConversations,
} from "@/lib/inbox/conversations";
import { cn } from "@/lib/utils";
import type { Conversation, ConversationStatus, Tag } from "@/types";
import { Search, ChevronDown, X, Flame, MessageCircle, Users, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";


const STATUS_COLORS: Record<ConversationStatus, string> = {
  open: "bg-primary",
  pending: "bg-amber-500",
  closed: "bg-muted-foreground",
};

type InboxFilter = ConversationStatus | "all" | "unread" | "unanswered" | "overdue";
type ChatTab = "direct" | "groups";

/** Heuristic: treat a conversation as a group if its contact phone
 *  contains `@g.us` (WhatsApp group JID format) or if the DB-level
 *  `chat_type` field is explicitly set to `'group'`. */
function isGroupConversation(conv: Conversation): boolean {
  if (conv.chat_type === "group") return true;
  const phone = conv.contact?.phone ?? "";
  return phone.includes("@g.us") || phone.startsWith("120363") || phone.startsWith("+120363");
}

interface ConversationListProps {
  activeConversationId: string | null;
  onSelect: (conversation: Conversation) => void;
  conversations: Conversation[];
  onConversationsLoaded: (conversations: Conversation[]) => void;
  initialFilter?: InboxFilter;
  selectedSalesMemberId?: string | null;
  onSalesMemberChange?: (id: string | null) => void;
  resyncToken?: number;
}

export function ConversationList({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  initialFilter,
  selectedSalesMemberId,
  onSalesMemberChange,
  resyncToken = 0,
}: ConversationListProps) {
  const t = useTranslations("Inbox.conversationList");
  
  const FILTER_OPTIONS: { label: string; value: InboxFilter }[] = useMemo(() => [
    { label: t("filterAll"), value: "all" },
    { label: "⚡ Unanswered", value: "unanswered" },
    { label: "⚠️ Overdue SLA", value: "overdue" },
    { label: t("filterUnread"), value: "unread" },
    { label: t("filterOpen"), value: "open" },
    { label: t("filterPending"), value: "pending" },
    { label: t("filterClosed"), value: "closed" },
  ], [t]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>(initialFilter ?? "all");
  const [loading, setLoading] = useState(true);
  const [chatTab, setChatTab] = useState<ChatTab>("direct");
  const [showAllTime, setShowAllTime] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync initialFilter prop if it changes
  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  // Contact-based filters
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const onConversationsLoadedRef = useRef(onConversationsLoaded);
  useEffect(() => {
    onConversationsLoadedRef.current = onConversationsLoaded;
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      let query = supabase
        .from("conversations")
        .select(CONVERSATION_SELECT)
        .order("last_message_at", { ascending: false });

      if (!showAllTime) {
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        query = query.gte("last_message_at", fiveDaysAgo.toISOString()).limit(200);
      }

      let fetchResult = await query;

      // If PostgREST cannot find the relationship in schema cache (PGRST200 / PGRST205 / unmigrated),
      // seamlessly fall back to base select so conversations load without error.
      if (
        fetchResult.error &&
        (fetchResult.error.code === "PGRST200" ||
          fetchResult.error.code === "PGRST205" ||
          fetchResult.error.message?.includes("relationship") ||
          fetchResult.error.message?.includes("schema cache"))
      ) {
        let fallbackQuery = supabase
          .from("conversations")
          .select(CONVERSATION_BASE_SELECT)
          .order("last_message_at", { ascending: false });
          
        if (!showAllTime) {
          const fiveDaysAgo = new Date();
          fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
          fallbackQuery = fallbackQuery.gte("last_message_at", fiveDaysAgo.toISOString()).limit(200);
        }
        
        fetchResult = await fallbackQuery;
      }

      if (cancelled) return;

      if (fetchResult.error) {
        console.error(
          `Failed to fetch conversations: ${fetchResult.error.message || fetchResult.error.code || "Unknown error"}`,
          fetchResult.error
        );
        setLoading(false);
        return;
      }

      let normalized = normalizeConversations(fetchResult.data ?? []);

      // If any conversation has an assigned_sales_member_id but assigned_sales_member wasn't populated via join,
      // stitch from the sales members API in the background.
      const hasUnjoinedRep = normalized.some(
        (c) => c.assigned_sales_member_id && !c.assigned_sales_member
      );

      if (hasUnjoinedRep) {
        try {
          const res = await fetch("/api/fortline/sales-members");
          if (res.ok) {
            const json = await res.json();
            const members = json.members || [];
            if (Array.isArray(members) && members.length > 0) {
              const repMap = new Map(members.map((m: any) => [m.id, m]));
              normalized = normalized.map((c) => {
                if (
                  c.assigned_sales_member_id &&
                  !c.assigned_sales_member &&
                  repMap.has(c.assigned_sales_member_id)
                ) {
                  return {
                    ...c,
                    assigned_sales_member: repMap.get(c.assigned_sales_member_id),
                  };
                }
                return c;
              });
            }
          }
        } catch {
          // Non-blocking fallback
        }
      }

      if (!cancelled) {
        onConversationsLoadedRef.current(normalized);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resyncToken, showAllTime]);

  // Tag definitions for the filter picker — loaded once so labels/colours
  // stay stable regardless of which conversations happen to be loaded.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      if (!cancelled && data) setTags(data as Tag[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Company options are derived from the loaded conversations — there's no
  // separate companies table, and only companies with a live conversation
  // are worth offering as an inbox filter.
  const companies = useMemo(() => {
    const set = new Set<string>();
    for (const c of conversations) {
      const co = c.contact?.company?.trim();
      if (co) set.add(co);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [conversations]);

  const tagsById = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  const filtered = useMemo(() => {
    let result = conversations;

    // Tab-level split: direct vs groups
    if (chatTab === "groups") {
      result = result.filter(isGroupConversation);
    } else {
      result = result.filter((c) => !isGroupConversation(c));
    }

    if (filter === "unanswered") {
      result = result.filter((c) => c.is_unanswered === true);
    } else if (filter === "overdue") {
      result = result.filter((c) => c.is_overdue === true);
    } else if (filter === "unread") {
      result = result.filter((c) => c.unread_count > 0);
    } else if (filter !== "all") {
      result = result.filter((c) => c.status === filter);
    }

    if (selectedSalesMemberId === "unassigned") {
      result = result.filter((c) => !c.assigned_sales_member_id);
    } else if (selectedSalesMemberId) {
      result = result.filter((c) => c.assigned_sales_member_id === selectedSalesMemberId);
    }

    // Contact-based filters (tags via OR logic, exact company match).
    if (selectedTagIds.length > 0 || selectedCompany !== null) {
      result = result.filter((c) =>
        matchesContactFilters(c, {
          tagIds: selectedTagIds,
          company: selectedCompany,
        })
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = c.contact?.name?.toLowerCase() ?? "";
        const phone = c.contact?.phone?.toLowerCase() ?? "";
        const lastMsg = c.last_message_text?.toLowerCase() ?? "";
        const repName = c.assigned_sales_member?.name?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || lastMsg.includes(q) || repName.includes(q);
      });
    }

    return result;
  }, [conversations, filter, search, selectedTagIds, selectedCompany, selectedSalesMemberId, chatTab]);

  // Count groups so the tab can show a badge
  const groupCount = useMemo(
    () => conversations.filter(isGroupConversation).length,
    [conversations]
  );

  const toggleTag = useCallback((id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const clearContactFilters = useCallback(() => {
    setSelectedTagIds([]);
    setSelectedCompany(null);
  }, []);

  const hasContactFilters = selectedTagIds.length > 0 || selectedCompany !== null;

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  }, [filtered, selectedIds.size]);

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} conversation(s)? This action cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        onConversationsLoadedRef.current(conversations.filter(c => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete conversations");
      }
    } catch (err) {
      alert("Network error while deleting");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        onConversationsLoadedRef.current(conversations.filter(c => c.id !== id));
        if (selectedIds.has(id)) {
          const next = new Set(selectedIds);
          next.delete(id);
          setSelectedIds(next);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete conversation");
      }
    } catch (err) {
      alert("Network error while deleting");
    }
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

  const handleSelect = useCallback(
    (conv: Conversation) => {
      onSelect(conv);
    },
    [onSelect]
  );

  const activeFilter = FILTER_OPTIONS.find((o) => o.value === filter);

  return (
    // w-full on mobile so the list occupies the whole viewport when it's
    // the single pane showing; proportional width on tablet, desktop and 4K ultrawide.
    <div className="flex h-full w-full flex-col border-r border-border bg-card md:w-72 lg:w-80 xl:w-96 2xl:w-[400px] shrink-0">
      {/* Search + Filter */}
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder={t("searchPlaceholder")}
            className="border-border bg-muted pl-9 text-sm text-foreground placeholder-muted-foreground focus:border-primary/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted">
                {activeFilter?.label ?? t("filterAll")}
                <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-36 border-border bg-popover"
            >
              {FILTER_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={cn(
                    "text-sm",
                    filter === opt.value
                      ? "text-primary font-semibold"
                      : "text-popover-foreground"
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {tags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex items-center justify-center h-7 gap-1 px-2 text-xs rounded-md hover:bg-muted",
                  selectedTagIds.length > 0
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("tags")}
                {selectedTagIds.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {selectedTagIds.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-64 w-56 border-border bg-popover"
              >
                {tags.map((t) => (
                  <DropdownMenuCheckboxItem
                    key={t.id}
                    checked={selectedTagIds.includes(t.id)}
                    onCheckedChange={() => toggleTag(t.id)}
                    className="text-sm text-popover-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate">{t.name}</span>
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {companies.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex max-w-40 items-center justify-center h-7 gap-1 px-2 text-xs rounded-md hover:bg-muted",
                  selectedCompany
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="truncate">{selectedCompany ?? t("company")}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="max-h-64 w-56 border-border bg-popover"
              >
                <DropdownMenuItem
                  onClick={() => setSelectedCompany(null)}
                  className={cn(
                    "text-sm",
                    selectedCompany === null
                      ? "text-primary"
                      : "text-popover-foreground"
                  )}
                >
                  {t("allCompanies")}
                </DropdownMenuItem>
                {companies.map((co) => (
                  <DropdownMenuItem
                    key={co}
                    onClick={() => setSelectedCompany(co)}
                    className={cn(
                      "text-sm",
                      selectedCompany === co
                        ? "text-primary"
                        : "text-popover-foreground"
                    )}
                  >
                    <span className="truncate">{co}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {hasContactFilters && (
          <div className="flex flex-wrap items-center gap-1">
            {selectedTagIds.map((id) => {
              const tag = tagsById.get(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleTag(id)}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground hover:bg-muted/70"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tag?.color ?? "var(--muted-foreground)" }}
                  />
                  <span className="max-w-24 truncate">{tag?.name ?? t("tags")}</span>
                  <X className="h-3 w-3" />
                </button>
              );
            })}
            {selectedCompany && (
              <button
                onClick={() => setSelectedCompany(null)}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground hover:bg-muted/70"
              >
                <span className="max-w-24 truncate">{selectedCompany}</span>
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={clearContactFilters}
              className="px-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              {t("clearAll")}
            </button>
          </div>
        )}
      </div>

        {/* ── Chats / Groups tab bar ── */}
        <div className="flex border-t border-border">
          <button
            onClick={() => setChatTab("direct")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors",
              chatTab === "direct"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("tabChats")}
          </button>
          <button
            onClick={() => setChatTab("groups")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors",
              chatTab === "groups"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {t("tabGroups")}
            {groupCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold">
                {groupCount}
              </span>
            )}
          </button>
        </div>

      {/* ── Selection Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSelectAll}
              className="flex h-4 w-4 items-center justify-center rounded border border-primary text-primary bg-primary transition-colors hover:bg-primary/90"
            >
              {selectedIds.size === filtered.length && filtered.length > 0 ? (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary-foreground"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <span className="h-2 w-2 bg-primary-foreground" />
              )}
            </button>
            <span className="text-[11px] font-medium text-primary">
              {selectedIds.size} selected
            </span>
          </div>
          <button
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Delete
          </button>
        </div>
      )}

      {/* ── Optional "Select All" above list when no selection ── */}
      {selectedIds.size === 0 && filtered.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 shrink-0 bg-muted/20">
          <button 
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex h-4 w-4 items-center justify-center rounded border border-input bg-background">
            </div>
            Select All
          </button>
        </div>
      )}

      {/* Conversation Items.
          `min-h-0` is load-bearing: a flex child defaults to
          min-height:auto, so without it this ScrollArea grows to fit
          every conversation instead of shrinking to the remaining
          space — the list then overflows and gets clipped by the
          parent's overflow-hidden with no scrollbar (issue #229). */}
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">
              {chatTab === "groups" ? t("noGroupsFound") : t("noConversations")}
            </p>
            {selectedSalesMemberId && selectedSalesMemberId !== "all" && selectedSalesMemberId !== "unassigned" && (
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                No chats synced for this representative yet. If their phone is linked to WhatsApp, click the <span className="text-primary font-semibold">Sync Chats</span> button above or check their status in Settings &gt; Sales Channels.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {filtered.map((conv) => {
              return (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  isSelected={selectedIds.has(conv.id)}
                  onSelect={handleSelect}
                  onToggleSelect={handleToggleSelect}
                  onDelete={handleDeleteSingle}
                  t={t}
                />
              );
            })}
            
            {/* Load Older Chats */}
            {!showAllTime && filtered.length >= 0 && (
              <div className="p-4 flex justify-center border-t border-border mt-2">
                <button
                  onClick={() => setShowAllTime(true)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Load older chats
                </button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function ConversationItem({
  conversation,
  isActive,
  isSelected,
  onSelect,
  onToggleSelect,
  onDelete,
  t,
}: ConversationItemProps) {
  const contact = conversation.contact;
  const displayName = contact?.name || contact?.phone || t("unknown");
  const initials = displayName.charAt(0).toUpperCase();
  const salesMember = conversation.assigned_sales_member;
  const isGroup = isGroupConversation(conversation);
  const [avatarError, setAvatarError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onSelect(conversation);
  }, [onSelect, conversation]);

  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), {
        addSuffix: false,
      })
    : "";

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 cursor-pointer",
        isActive && "border-l-2 border-primary bg-muted/70",
        isSelected && "bg-primary/5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Selection Checkbox */}
      {(isSelected || isHovered) && (
        <div 
          className="absolute left-2 top-3 z-10" 
          onClick={(e) => { e.stopPropagation(); onToggleSelect(conversation.id); }}
        >
          <div className={cn(
            "h-4 w-4 rounded-sm border flex items-center justify-center transition-colors",
            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-primary/50 bg-background hover:border-primary"
          )}>
            {isSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        </div>
      )}

      {/* Avatar */}
      <div className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground transition-opacity",
        (isSelected || isHovered) ? "opacity-0" : "opacity-100"
      )}>
        {isGroup ? (
          /* Group avatar — multi-user icon */
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600/20">
            <Users className="h-5 w-5 text-teal-500" />
          </div>
        ) : contact?.avatar_url && !avatarError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.avatar_url}
            alt={displayName}
            className="h-10 w-10 rounded-full object-cover"
            onError={() => setAvatarError(true)}
          />
        ) : (
          initials
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
            <span className="truncate">{displayName}</span>
            {isGroup && (
              <span className="inline-flex items-center gap-0.5 rounded bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-bold text-teal-500 border border-teal-500/30 shrink-0">
                <Users className="h-2.5 w-2.5" />
                {t("groupBadge")}
              </span>
            )}
            {conversation.is_unanswered && (
              <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 border border-amber-500/30 shrink-0">
                Unanswered
              </span>
            )}
            {conversation.is_overdue && (
              <span className="inline-flex items-center rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-500 border border-rose-500/30 shrink-0">
                Overdue
              </span>
            )}
            {contact?.is_spam && (
              <span className="inline-flex items-center rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-medium text-rose-500 border border-rose-500/20 uppercase tracking-wide shrink-0">
                Spam
              </span>
            )}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo}</span>
        </div>

        {/* Assigned Rep & Division badge */}
        {salesMember && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="font-semibold text-primary truncate max-w-[130px]">
              Rep: {salesMember.name}
            </span>
            {salesMember.division && (
              <span className="truncate text-muted-foreground/80">
                • {salesMember.division}
              </span>
            )}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">
            {conversation.last_message_text ||
              (conversation as any).last_message_preview ||
              t("noMessagesYet")}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {conversation.unread_count > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {conversation.unread_count}
              </span>
            )}
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                STATUS_COLORS[conversation.status]
              )}
              title={conversation.status}
            />
          </div>
        </div>
      </div>
      
      {/* Action Menu */}
      <div 
        className={cn(
          "absolute right-2 top-2 z-10 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded-full bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground shadow-sm">
            <MoreVertical className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem 
              onClick={() => onDelete(conversation.id)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
