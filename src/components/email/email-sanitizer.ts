import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes HTML email content to prevent XSS attacks while preserving
 * standard email styling and layouts.
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return ''

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target', 'rel', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  })
}
