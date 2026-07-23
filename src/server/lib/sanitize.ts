/**
 * Plain-text content sanitizer for community posts and comments (p8-012).
 *
 * Content model: community content is plain text. HTML is never stored.
 * The iOS client renders post/comment content with SwiftUI `Text()` (not a
 * WebView), so there is no render-time XSS surface — but we sanitize on
 * write as defense-in-depth against a future HTML render path.
 *
 * Strategy: strip all HTML tags and normalize whitespace. No allowlist
 * sanitizer is needed because no HTML survives storage at all.
 */

/**
 * Sanitize user-supplied post/comment content for storage.
 *
 * - Strips every HTML tag (opening, closing, self-closing, malformed).
 * - Removes HTML entities (e.g. `&lt;` → `<`) so a double-encode trick
 *   like `&lt;script&gt;` can't survive as a literal `&lt;script&gt;` that
 *   a future HTML renderer would decode back to `<script>`.
 * - Collapses runs of whitespace to single spaces and trims.
 *
 * @param content - raw user-supplied content
 * @returns sanitized plain text safe to store and safe to render as text
 */
export function sanitizeCommunityContent(content: string): string {
  return content
    // Decode HTML entities FIRST so an encoded tag like &lt;script&gt;
    // becomes <script> and is caught by the tag strip below. This prevents
    // a double-encode round-trip through a future HTML renderer.
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    // Strip all HTML tags (greedy, handles multi-line tags)
    .replace(/<[^>]*>/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}
