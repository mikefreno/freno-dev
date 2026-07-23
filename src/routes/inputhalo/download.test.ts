/**
 * Unit tests for the InputHalo landing-page download flow (task 06).
 *
 * The helper in `./download.ts` is pure (no solid-js / router / meta imports),
 * so we exercise the acceptance criterion directly — "the download button
 * calls `api.downloads.getDownloadUrl` with `'inputhalo'` and redirects to the
 * signed S3 URL" — without a DOM.
 *
 * Integration / visual checks (the rendered landing page, the tRPC client) are
 * covered by the build gate (`bun run build`) and the manual validation steps
 * in the task spec; the component is a thin wrapper over this helper.
 */
import { describe, it, expect, mock } from "bun:test";
import {
  INPUTHALO_APP_STORE_URL,
  INPUTHALO_ASSET_NAME,
  INPUTHALO_ICON_DARK,
  INPUTHALO_ICON_DEFAULT,
  INPUTHALO_MIN_SYSTEM_VERSION,
  performInputHaloDownload,
  queryInputHaloDownload,
  type DownloadQueryApi
} from "./download";

describe("InputHalo download constants", () => {
  it("asset name is 'inputhalo' (matches downloads.tsx)", () => {
    expect(INPUTHALO_ASSET_NAME).toBe("inputhalo");
  });

  it("app store URL points at the InputHalo listing", () => {
    expect(INPUTHALO_APP_STORE_URL).toBe(
      "https://apps.apple.com/us/app/inputhalo/"
    );
  });

  it("minimum system version is 14.6 (per Info.plist)", () => {
    expect(INPUTHALO_MIN_SYSTEM_VERSION).toBe("14.6");
  });

  it("icons resolve from the 'InputHalo Exports' subfolder (Gaze pattern)", () => {
    expect(INPUTHALO_ICON_DARK).toBe(
      "/InputHalo Exports/InputHalo-iOS-Dark-1024x1024@1x.png"
    );
    expect(INPUTHALO_ICON_DEFAULT).toBe(
      "/InputHalo Exports/InputHalo-iOS-Default-1024x1024@1x.png"
    );
  });
});

describe("queryInputHaloDownload", () => {
  it("calls the query with asset_name 'inputhalo' and returns the signed URL", async () => {
    const query = mock(
      (async (input: { asset_name: string }) => {
        expect(input.asset_name).toBe("inputhalo");
        return { downloadURL: "https://s3.example.com/InputHalo.dmg?signed=1" };
      }) as DownloadQueryApi
    );

    const url = await queryInputHaloDownload(query);

    expect(query).toHaveBeenCalledTimes(1);
    expect(url).toBe("https://s3.example.com/InputHalo.dmg?signed=1");
  });

  it("propagates the exact asset name 'inputhalo' (spelled correctly)", async () => {
    let captured: string | undefined;
    const query: DownloadQueryApi = async (input) => {
      captured = input.asset_name;
      return { downloadURL: "https://example.com/x.dmg" };
    };
    await queryInputHaloDownload(query);
    expect(captured).toBe("inputhalo");
  });

  it("propagates query rejection", async () => {
    const boom = new Error("S3 unreachable");
    const query: DownloadQueryApi = async () => {
      throw boom;
    };
    await expect(queryInputHaloDownload(query)).rejects.toThrow(boom);
  });
});

describe("performInputHaloDownload", () => {
  const SIGNED_URL = "https://s3.example.com/InputHalo-0.1.0.dmg?sig=abc";

  it("redirects to the signed S3 URL returned by the query", async () => {
    const query = mock(
      (async () => ({ downloadURL: SIGNED_URL })) as DownloadQueryApi
    );
    const redirect = mock((url: string) => url);

    const ok = await performInputHaloDownload(query, redirect);

    expect(ok).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(SIGNED_URL);
  });

  it("queries the tRPC endpoint with asset_name 'inputhalo'", async () => {
    const seen: { asset_name: string }[] = [];
    const query: DownloadQueryApi = async (input) => {
      seen.push(input);
      return { downloadURL: SIGNED_URL };
    };
    const redirect = mock((_url: string) => {});

    await performInputHaloDownload(query, redirect);

    expect(seen).toEqual([{ asset_name: "inputhalo" }]);
  });

  it("does not redirect when the query rejects", async () => {
    const query: DownloadQueryApi = async () => {
      throw new Error("network down");
    };
    const redirect = mock((_url: string) => {});
    const onError = mock((_: unknown) => {});

    const ok = await performInputHaloDownload(query, redirect, onError);

    expect(ok).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("defaults the error sink to console.error", async () => {
    const original = console.error;
    const seen: unknown[] = [];
    console.error = (...args: unknown[]) => seen.push(args);

    const query: DownloadQueryApi = async () => {
      throw new Error("boom");
    };

    try {
      const ok = await performInputHaloDownload(query, () => {});
      expect(ok).toBe(false);
      expect(seen.length).toBeGreaterThanOrEqual(1);
    } finally {
      console.error = original;
    }
  });
});
