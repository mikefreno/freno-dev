/**
 * Pure, side-effect-free download orchestration for the InputHalo landing
 * page (task 06).
 *
 * Extracted from the route component so the acceptance criterion —
 * "download button calls `api.downloads.getDownloadUrl` with `'inputhalo'`
 *  and redirects to the signed S3 URL" — can be unit-tested in `bun:test`
 * without importing solid-js / `@solidjs/router` / `@solidjs/meta` (the same
 * pattern established by `~/components/page-head-meta.ts` and
 * `~/lib/nav-config.ts`).
 *
 * The route component (`./index.tsx`) is a thin wrapper that supplies the
 * real `api` (the tRPC client) and a `redirect` that mutates
 * `window.location.href`, plus loading/error UX. The data-flow contract
 * lives here.
 */

/** tRPC asset name for the InputHalo macOS DMG (matches `downloads.tsx`). */
export const INPUTHALO_ASSET_NAME = "inputhalo" as const;

/** App Store listing for InputHalo (paid variant — "coming soon"). */
export const INPUTHALO_APP_STORE_URL =
  "https://apps.apple.com/us/app/inputhalo/" as const;

/** Minimum macOS version supported by InputHalo (per Info.plist). */
export const INPUTHALO_MIN_SYSTEM_VERSION = "14.6" as const;

/** Public asset paths for the app icon, switched on dark/light theme. */
export const INPUTHALO_ICON_DARK =
  "/InputHalo Exports/InputHalo-iOS-Dark-1024x1024@1x.png" as const;
export const INPUTHALO_ICON_DEFAULT =
  "/InputHalo Exports/InputHalo-iOS-Default-1024x1024@1x.png" as const;

/**
 * Structural type of the slice of the tRPC client this helper consumes.
 * Keeps the helper decoupled from the full `api` surface and testable with a
 * stub.
 */
export interface DownloadQueryApi {
  (input: { asset_name: string }): Promise<{ downloadURL: string }>;
}

/**
 * Resolve the signed S3 download URL for the InputHalo DMG.
 *
 * Pure: issues the query via the supplied `api` callable and returns the
 * resulting `downloadURL`. Throws if the underlying query rejects — the
 * caller owns the user-facing error UX.
 *
 * @example
 * ```ts
 * const url = await queryInputHaloDownload(
 *   (input) => api.downloads.getDownloadUrl.query(input)
 * );
 * ```
 */
export async function queryInputHaloDownload(
  query: DownloadQueryApi
): Promise<string> {
  const data = await query({ asset_name: INPUTHALO_ASSET_NAME });
  return data.downloadURL;
}

/**
 * Drive the full DMG download flow: call the tRPC endpoint with the
 * InputHalo asset name, then hand the signed URL to `redirect`.
 *
 * Returns a boolean indicating success so callers can branch their loading-
 * state cleanup without a try/catch (errors are caught internally and surfaced
 * via the `onError` callback — keeps the component body tidy).
 *
 * @param query    tRPC query callable (the `api.downloads.getDownloadUrl`
 *                 bound method).
 * @param redirect Side-effect invoked with the signed S3 URL (typically
 *                 `(url) => { window.location.href = url; }`).
 * @param onError  Optional error sink (defaults to `console.error`).
 * @returns `true` on success, `false` if the query rejected.
 */
export async function performInputHaloDownload(
  query: DownloadQueryApi,
  redirect: (url: string) => void,
  onError?: (error: unknown) => void
): Promise<boolean> {
  try {
    const url = await queryInputHaloDownload(query);
    redirect(url);
    return true;
  } catch (error) {
    (onError ?? console.error)("InputHalo download error:", error);
    return false;
  }
}
