/**
 * Client-side utility functions
 * Note: These utilities should only run in the browser
 */

/**
 * Fetch wrapper for auth checks where 401s are expected and should not trigger console errors
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, init);
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Decode JWT payload without verification (client-side only)
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function decodeJWT(token: string): {
  id: string;
  sid: string;
  exp: number;
  iat: number;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    return payload;
  } catch {
    return null;
  }
}

/**
 * Get time until JWT expires (in milliseconds)
 * @param token - JWT token string
 * @returns Milliseconds until expiry, or null if invalid/expired
 */
export function getTimeUntilExpiry(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;

  const expiryMs = payload.exp * 1000;
  const now = Date.now();
  const timeUntil = expiryMs - now;

  return timeUntil > 0 ? timeUntil : null;
}

/**
 * Inserts soft hyphens (&shy;) for manual hyphenation. Uses actual characters for Typewriter compatibility.
 */
export function insertSoftHyphens(
  text: string,
  minWordLength: number = 8
): string {
  return text
    .split(" ")
    .map((word) => {
      if (word.length < minWordLength) return word;

      const patterns = [
        {
          pattern:
            /^(un|re|in|dis|en|non|pre|pro|anti|de|mis|over|sub|super|trans|under)(.+)/i,
          split: 1
        },
        {
          pattern:
            /(.+)(ing|tion|sion|ness|ment|able|ible|ful|less|ship|hood|ward|like)$/i,
          split: 1
        },
        { pattern: /(.+[aeiou])([bcdfghjklmnpqrstvwxyz])\2(.+)/i, split: 2 },
        {
          pattern:
            /(.+)(stand|work|time|place|where|thing|back|over|under|out)$/i,
          split: 1
        }
      ];

      for (const { pattern, split } of patterns) {
        const match = word.match(pattern);
        if (match) {
          if (split === 1) {
            return match[1] + "\u00AD" + match[2];
          } else if (split === 2) {
            return match[1] + match[2] + "\u00AD" + match[2] + match[3];
          }
        }
      }

      if (word.length > 12) {
        const chunks: string[] = [];
        for (let i = 0; i < word.length; i += 6) {
          chunks.push(word.slice(i, i + 6));
        }
        return chunks.join("\u00AD");
      }

      return word;
    })
    .join(" ");
}

export function glitchText(
  originalText: string,
  setter: (text: string) => void,
  glitchInterval: number = 300,
  glitchLength: number = 80
) {
  const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";

  const interval = setInterval(() => {
    if (Math.random() > 0.9) {
      let glitched = "";
      for (let i = 0; i < originalText.length; i++) {
        if (Math.random() > 0.8) {
          glitched +=
            glitchChars[Math.floor(Math.random() * glitchChars.length)];
        } else {
          glitched += originalText[i];
        }
      }
      setter(glitched);

      setTimeout(() => {
        setter(originalText);
      }, glitchLength);
    }
  }, glitchInterval);
  return interval;
}
