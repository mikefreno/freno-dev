import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallerFactory } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";
import { sanitizeS3PathComponent, s3TypeSchema } from "./misc";

// Mock the S3 client and getSignedUrl function
const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn().mockResolvedValue("https://test-signed-url.com");

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    constructor() {}
    send = mockSend;
  },
  GetObjectCommand: class {
    constructor(params: any) {
      this.params = params;
    }
    params: any;
  },
  PutObjectCommand: class {
    constructor(params: any) {
      this.params = params;
    }
    params: any;
  },
  DeleteObjectCommand: class {
    constructor(params: any) {
      this.params = params;
    }
    params: any;
  },
  ListObjectsV2Command: class {
    constructor(params: any) {
      this.params = params;
    }
    params: any;
  }
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl
}));

// Mock environment variables
process.env.AWS_REGION = "us-east-1";
process.env.MY_AWS_ACCESS_KEY = "test-access-key";
process.env.MY_AWS_SECRET_KEY = "test-secret-key";
process.env.AWS_S3_BUCKET_NAME = "test-bucket";

// Mock CSRF protection to always pass in tests
vi.mock("~/server/security", () => ({
  csrfProtection: vi.fn()
}));

describe("sanitizeS3PathComponent", () => {
  it("should strip path traversal sequences", () => {
    expect(sanitizeS3PathComponent("../etc/passwd")).not.toContain("..");
    expect(sanitizeS3PathComponent("foo/../../bar")).not.toContain("..");
  });

  it("should normalize slashes to hyphens", () => {
    expect(sanitizeS3PathComponent("foo/bar")).toBe("foo-bar");
    expect(sanitizeS3PathComponent("foo\\bar")).toBe("foo-bar");
  });

  it("should strip non-alphanumeric characters except hyphens and underscores", () => {
    expect(sanitizeS3PathComponent("foo<script>alert</script>bar")).toBe("fooscriptalert-scriptbar");
  });

  it("should trim leading/trailing hyphens", () => {
    expect(sanitizeS3PathComponent("---foo---")).toBe("foo");
  });

  it("should collapse multiple hyphens", () => {
    expect(sanitizeS3PathComponent("foo---bar")).toBe("foo-bar");
  });

  it("should truncate long strings", () => {
    const long = "a".repeat(300);
    expect(sanitizeS3PathComponent(long)).toHaveLength(255);
  });

  it("should handle empty result", () => {
    expect(sanitizeS3PathComponent("!!!@#$")).toBe("");
  });
});

describe("s3TypeSchema", () => {
  it("should accept allowed types", () => {
    expect(s3TypeSchema.safeParse("blog").success).toBe(true);
    expect(s3TypeSchema.safeParse("attachments").success).toBe(true);
    expect(s3TypeSchema.safeParse("avatars").success).toBe(true);
    expect(s3TypeSchema.safeParse("users").success).toBe(true);
  });

  it("should reject disallowed types", () => {
    expect(s3TypeSchema.safeParse("../etc").success).toBe(false);
    expect(s3TypeSchema.safeParse("malicious").success).toBe(false);
    expect(s3TypeSchema.safeParse("").success).toBe(false);
  });
});

describe("misc router security", () => {
  let mockEvent: any;

  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ $metadata: {} });
    mockGetSignedUrl.mockReset();
    mockGetSignedUrl.mockResolvedValue("https://test-signed-url.com");
    mockEvent = {
      node: {
        req: {
          url: "/api/trpc",
          method: "POST",
          headers: {}
        }
      }
    };
  });

  function createMockContext(overrides: any = {}): any {
    return {
      event: { nativeEvent: mockEvent },
      userId: null,
      isAdmin: false,
      nessaUserId: null,
      ...overrides
    };
  }

  describe("simpleDeleteImage", () => {
    it("should reject unauthenticated requests", async () => {
      const ctx = createMockContext({ userId: null });
      const caller = createCallerFactory(ctx);

      await expect(
        caller.misc.simpleDeleteImage.mutate({ key: "attachments/user123/test.jpg" })
      ).rejects.toThrow(/UNAUTHORIZED|Not authenticated/);
    });

    it("should reject requests for other user's keys", async () => {
      const ctx = createMockContext({ userId: "user123" });
      const caller = createCallerFactory(ctx);

      await expect(
        caller.misc.simpleDeleteImage.mutate({ key: "attachments/user456/test.jpg" })
      ).rejects.toThrow(/FORBIDDEN|Access denied/);
    });

    it("should allow authenticated user to delete their own key", async () => {
      const ctx = createMockContext({ userId: "user123" });
      const caller = createCallerFactory(ctx);

      await caller.misc.simpleDeleteImage.mutate({
        key: "attachments/user123/test.jpg"
      });

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("deleteImage", () => {
    it("should reject unauthenticated requests", async () => {
      const ctx = createMockContext({ userId: null });
      const caller = createCallerFactory(ctx);

      await expect(
        caller.misc.deleteImage.mutate({
          key: "attachments/user123/test.jpg",
          newAttachmentString: "",
          type: "Post",
          id: 1
        })
      ).rejects.toThrow(/UNAUTHORIZED|Not authenticated/);
    });

    it("should reject requests for other user's keys", async () => {
      const ctx = createMockContext({ userId: "user123" });
      const caller = createCallerFactory(ctx);

      await expect(
        caller.misc.deleteImage.mutate({
          key: "attachments/user456/test.jpg",
          newAttachmentString: "",
          type: "Post",
          id: 1
        })
      ).rejects.toThrow(/FORBIDDEN|Access denied/);
    });

    it("should allow authenticated user to delete their own key", async () => {
      const ctx = createMockContext({ userId: "user123" });
      const caller = createCallerFactory(ctx);

      await caller.misc.deleteImage.mutate({
        key: "attachments/user123/test.jpg",
        newAttachmentString: "",
        type: "Post",
        id: 1
      });

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe("getPreSignedURL", () => {
    it("should reject unauthenticated requests", async () => {
      const ctx = createMockContext({ userId: null });
      const caller = createCallerFactory(ctx);

      await expect(
        caller.misc.getPreSignedURL.mutate({
          type: "blog",
          title: "Test",
          filename: "test.jpg"
        })
      ).rejects.toThrow(/UNAUTHORIZED|Not authenticated/);
    });

    it("should include userId in the generated key", async () => {
      const ctx = createMockContext({ userId: "user123" });
      const caller = createCallerFactory(ctx);

      const result = await caller.misc.getPreSignedURL.mutate({
        type: "attachments",
        title: "My Title",
        filename: "test.jpg"
      });

      expect(result.key).toContain("user123");
    });
  });

  describe("listAttachments", () => {
    it("should reject unauthenticated requests", async () => {
      const ctx = createMockContext({ userId: null });
      const caller = createCallerFactory(ctx);

      await expect(
        caller.misc.listAttachments.query({
          type: "attachments",
          title: "Test"
        })
      ).rejects.toThrow(/UNAUTHORIZED|Not authenticated/);
    });

    it("should scope prefix to authenticated user", async () => {
      mockSend.mockResolvedValue({ Contents: [] });

      const ctx = createMockContext({ userId: "user123" });
      const caller = createCallerFactory(ctx);

      await caller.misc.listAttachments.query({
        type: "attachments",
        title: "Test"
      });

      // Verify the ListObjectsV2Command was called with user-scoped prefix
      const call = mockSend.mock.calls[0][0];
      expect(call.params.Prefix).toContain("user123");
    });
  });

  describe("getDownloadUrl", () => {
    it("should remain publicly accessible", async () => {
      const ctx = createMockContext({ userId: null });
      const caller = createCallerFactory(ctx);

      // This is intentionally public for Sparkle updater
      const result = await caller.misc.getDownloadUrl.query({
        asset_name: "shapes-with-abigail"
      });

      expect(result).toHaveProperty("downloadURL");
    });
  });
});
