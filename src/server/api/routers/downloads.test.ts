import { describe, it, expect, vi } from "vitest";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

// Mock the S3 client and getSignedUrl function
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    constructor() {}
    send() {
      return Promise.resolve({
        $metadata: {},
        Body: "test content"
      });
    }
  },
  GetObjectCommand: class {
    constructor(params: any) {
      this.params = params;
    }
    params: any;
  }
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://test-signed-url.com")
}));

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
process.env._AWS_ACCESS_KEY = "test-access-key";
process.env._AWS_SECRET_KEY = "test-secret-key";
process.env.VITE_DOWNLOAD_BUCKET_STRING = "test-bucket";

describe("downloads router", () => {
  it("should return a signed URL for valid asset names", async () => {
    const caller = appRouter.createCaller(
      await createTRPCContext({ nativeEvent: {} } as any)
    );

    const result = await caller.downloads.getDownloadUrl.query({
      asset_name: "lineage"
    });

    expect(result).toHaveProperty("downloadURL");
    expect(typeof result.downloadURL).toBe("string");
  });

  it("should throw NOT_FOUND for invalid asset names", async () => {
    const caller = appRouter.createCaller(
      await createTRPCContext({ nativeEvent: {} } as any)
    );

    try {
      await caller.downloads.getDownloadUrl.query({
        asset_name: "invalid-asset"
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toHaveProperty("code", "NOT_FOUND");
    }
  });
});
