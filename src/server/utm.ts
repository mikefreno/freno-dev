/**
 * Campaign parameters, parsed once and shared by every analytics writer.
 *
 * The three keys kept here are the ones a launch plan actually groups by:
 * which channel (`utm_source`), through what (`utm_medium`), and which
 * specific push (`utm_campaign`). Values are trimmed and length-capped,
 * but never case-folded — an uppercase campaign name is a different
 * campaign until the author says otherwise.
 *
 * `parseUtm` is variadic and first-non-empty-wins per key, which is what
 * lets a logger pass both the URL it was called on and the referrer: a
 * download click carries no query of its own, but the landing page it
 * came from usually still does.
 */

export interface UtmParams {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

const EMPTY: UtmParams = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null
};

/** Longest value we will store; far above any real campaign name. */
const MAX_LEN = 200;

/**
 * Reads the query string out of a full URL, a path with a query, or a bare
 * `a=1&b=2` fragment. Returns null when there is nothing to read.
 */
function searchOf(input: string): URLSearchParams | null {
  try {
    return new URL(input).searchParams;
  } catch {
    // Not absolute — take everything after the first "?".
    const qIndex = input.indexOf("?");
    if (qIndex === -1) return null;
    return new URLSearchParams(input.slice(qIndex + 1));
  }
}

function read(
  search: URLSearchParams,
  key: string
): string | null {
  const value = search.get(key)?.trim();
  if (!value) return null;
  return value.slice(0, MAX_LEN);
}

/**
 * Extracts UTM parameters from any number of URL-ish strings.
 * Earlier arguments win per key; later ones only fill gaps.
 *
 * @example
 * parseUtm("https://nook.freno.me/?utm_source=hn&utm_campaign=launch")
 * // { utmSource: "hn", utmMedium: null, utmCampaign: "launch" }
 */
export function parseUtm(
  ...inputs: (string | null | undefined)[]
): UtmParams {
  const result: UtmParams = { ...EMPTY };

  for (const input of inputs) {
    if (!input) continue;
    // Everything present already — nothing left for later inputs to fill.
    if (result.utmSource && result.utmMedium && result.utmCampaign) break;

    const search = searchOf(input);
    if (!search) continue;

    result.utmSource ||= read(search, "utm_source");
    result.utmMedium ||= read(search, "utm_medium");
    result.utmCampaign ||= read(search, "utm_campaign");
  }

  return result;
}
