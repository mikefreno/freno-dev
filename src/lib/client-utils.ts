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
