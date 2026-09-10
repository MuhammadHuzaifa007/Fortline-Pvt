/**
 * Utility to strictly purge all client-side chat storage, message drafts,
 * conversation caches, and active line session credentials upon logout or device unlinking.
 */

export function purgeClientChatSession(salesMemberId?: string | null): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Purge targeted chat & inbox keys from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('wacrm:inbox') ||
          key.startsWith('fortline:chat') ||
          key.startsWith('fortline:messages') ||
          key.startsWith('fortline:draft') ||
          key.includes('contact-panel-open') ||
          (salesMemberId && key.includes(salesMemberId)))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 2. Clear transient session storage (active drafts, unsent payloads)
    sessionStorage.clear();

    // 3. Dispatch an internal event so any open React components reset memory state
    window.dispatchEvent(
      new CustomEvent('fortline:session-purged', {
        detail: {
          salesMemberId: salesMemberId ?? null,
          timestamp: Date.now(),
        },
      })
    );
  } catch (err) {
    console.warn('[session-purge] Failed to purge storage:', err);
  }
}
