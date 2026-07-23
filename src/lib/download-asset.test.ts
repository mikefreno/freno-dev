/**
 * Unit tests for the shared `downloadAsset` helper (task 05).
 *
 * The helper is a pure function over an injected `DownloadApi` + redirect sink,
 * so these tests verify the tRPC call shape, redirect, and error handling
 * without importing `~/lib/api` (which pulls in solid-js / CSRF cookie code).
 */
import { describe, it, expect, mock } from "bun:test";
import { downloadAsset, type DownloadApi } from "~/lib/download-asset";

function makeFakeApi(
  url: string,
  seen: { input: { asset_name: string } }[] = []
): DownloadApi {
  return {
    downloads: {
      getDownloadUrl: {
        query: async (input: { asset_name: string }) => {
          seen.push({ input });
          return { downloadURL: url };
        }
      }
    }
  };
}

describe("downloadAsset", () => {
  it("queries getDownloadUrl with the provided asset_name", async () => {
    const seen: { input: { asset_name: string } }[] = [];
    const api = makeFakeApi("https://s3/gaze.dmg", seen);
    await downloadAsset({ api, assetName: "gaze", redirect: () => {} });
    expect(seen).toHaveLength(1);
    expect(seen[0]!.input.asset_name).toBe("gaze");
  });

  it("redirects to the returned signed URL", async () => {
    const api = makeFakeApi("https://s3/gaze.dmg");
    const sink = mock((u: string) => {});
    await downloadAsset({ api, assetName: "gaze", redirect: sink });
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith("https://s3/gaze.dmg");
  });

  it("routes failures to onError without throwing", async () => {
    const api: DownloadApi = {
      downloads: {
        getDownloadUrl: {
          query: async () => {
            throw new Error("boom");
          }
        }
      }
    };
    const sink = mock((u: string) => {});
    const errSink = mock((e: unknown) => {});
    await expect(
      downloadAsset({ api, assetName: "gaze", redirect: sink, onError: errSink })
    ).resolves.toBeUndefined();
    expect(sink).not.toHaveBeenCalled();
    expect(errSink).toHaveBeenCalledTimes(1);
  });

  it("swallows errors silently when no onError is provided", async () => {
    const api: DownloadApi = {
      downloads: {
        getDownloadUrl: {
          query: async () => {
            throw new Error("boom");
          }
        }
      }
    };
    const sink = mock((u: string) => {});
    await expect(
      downloadAsset({ api, assetName: "gaze", redirect: sink })
    ).resolves.toBeUndefined();
    expect(sink).not.toHaveBeenCalled();
  });

  it("works for any asset name (not hard-coded to gaze)", async () => {
    const seen: { input: { asset_name: string } }[] = [];
    const api = makeFakeApi("https://s3/inputhalo.dmg", seen);
    const sink = mock((u: string) => {});
    await downloadAsset({ api, assetName: "inputhalo", redirect: sink });
    expect(seen[0]!.input.asset_name).toBe("inputhalo");
    expect(sink).toHaveBeenCalledWith("https://s3/inputhalo.dmg");
  });
});
