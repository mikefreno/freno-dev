/**
 * Client-side utility functions
 * Note: These utilities should only run in the browser
 */

/**
 * Triggers haptic feedback on mobile devices
 * @param duration - Duration in milliseconds (default 50ms for a light tap)
 */
export function hapticFeedback(duration: number = 50) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(duration);
  }
}

/**
 * Inserts soft hyphens (&shy;) into long words to enable manual hyphenation
 * Works with Typewriter component since it uses actual characters
 * @param text - The text to add hyphens to
 * @param minWordLength - Minimum word length to hyphenate (default 8)
 * @returns Text with soft hyphens inserted
 */
export function insertSoftHyphens(
  text: string,
  minWordLength: number = 8
): string {
  return text
    .split(" ")
    .map((word) => {
      // Skip short words
      if (word.length < minWordLength) return word;

      // Common English hyphenation patterns
      const patterns = [
        // Prefixes (break after)
        {
          pattern:
            /^(un|re|in|dis|en|non|pre|pro|anti|de|mis|over|sub|super|trans|under)(.+)/i,
          split: 1
        },
        // Suffixes (break before)
        {
          pattern:
            /(.+)(ing|tion|sion|ness|ment|able|ible|ful|less|ship|hood|ward|like)$/i,
          split: 1
        },
        // Double consonants (break between)
        { pattern: /(.+[aeiou])([bcdfghjklmnpqrstvwxyz])\2(.+)/i, split: 2 },
        // Compound words with common parts
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
            // Break after first capture group
            return match[1] + "\u00AD" + match[2];
          } else if (split === 2) {
            // Break between doubled consonants
            return match[1] + match[2] + "\u00AD" + match[2] + match[3];
          }
        }
      }

      // Fallback: Insert soft hyphen every 6-8 characters in very long words
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

/**
 * Creates a debounced function that delays execution until after specified delay
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function with cancel method
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return debounced;
}
