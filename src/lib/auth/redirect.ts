/**
 * Validates and returns a safe relative redirect URL.
 *
 * Enforces that post-auth destination paths:
 * - Start with a single slash `/`
 * - Do NOT start with `//` (prevents protocol-relative open redirects)
 * - Do NOT contain backslashes `\` anywhere
 * - Do NOT contain absolute scheme specifiers (`http:`, `https:`, etc.)
 * - Do NOT contain control characters
 *
 * Falls back to `/dashboard` (or custom fallback) when invalid or unsupplied.
 */
export function getSafeRedirect(
  url: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!url || typeof url !== "string") {
    return fallback;
  }

  const trimmed = url.trim();

  // Reject empty string, non-relative paths, protocol-relative paths (`//`), and any backslashes (`\`)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }

  // Reject URLs containing protocol schemes (e.g. /foo?redirect=https://evil.com or javascript:)
  if (trimmed.includes("://") || /[\u0000-\u001F\u007F-\u009F]/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
