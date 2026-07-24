/**
 * Pure, testable helper for triggering a signed-S3 download via the tRPC
 * `downloads.getDownloadUrl` endpoint.
 *
 * Extracted so the Gaze landing page's download button — and any
 * other subdomain landing page that needs the same flow (InputHalo, Lineage,
 * …) — can share a single code path AND be unit-tested without importing
 * `~/lib/api` (which transitively imports solid-js / CSRF cookie access).
 *
 * The component layer supplies the concrete `api` (dynamic-imported at click
 * time) and the `redirect` sink (defaults to `window.location.href = url`).
 * Tests inject a fake `api` and a capture sink.
 */

/** Structural shape of the tRPC downloads proxy this helper depends on. */
export interface DownloadApi {
  downloads: {
    getDownloadUrl: {
      query: (input: { asset_name: string }) => Promise<{
        downloadURL: string;
      }>;
    };
  };
}

/** A `(url) => void` sink the helper calls with the signed S3 URL. */
export type DownloadRedirect = (url: string) => void;

export interface DownloadAssetOptions {
  /** tRPC proxy (or fake) exposing `downloads.getDownloadUrl.query`. */
  api: DownloadApi;
  /** Asset key known to the downloads router (e.g. `"gaze"`). */
  assetName: string;
  /** Called with the signed URL. Defaults to `window.location.href = url`. */
  redirect?: DownloadRedirect;
  /** Invoked on failure; defaults to a no-op (component shows its own UI). */
  onError?: (error: unknown) => void;
}

/** Default redirect sink — browser navigation to the signed S3 URL. */
const defaultRedirect: DownloadRedirect = (url) => {
  if (typeof window !== "undefined") {
    window.location.href = url;
  }
};

/**
 * Resolve the latest signed download URL for `assetName` and redirect the
 * browser to it. Never throws — failures are routed to `onError`.
 *
 * @example
 * ```ts
 * import("~/lib/api").then(({ api }) => {
 *   downloadAsset({ api, assetName: "gaze" });
 * });
 * ```
 */
export async function downloadAsset(
  options: DownloadAssetOptions
): Promise<void> {
  const { api, assetName, redirect = defaultRedirect, onError } = options;

  try {
    const data = await api.downloads.getDownloadUrl.query({
      asset_name: assetName
    });
    redirect(data.downloadURL);
  } catch (error) {
    if (onError) onError(error);
  }
}
