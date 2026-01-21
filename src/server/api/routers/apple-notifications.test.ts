import { describe, it, expect, vi } from "vitest";
import { createCallerFactory, appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

vi.mock("~/server/apple-notification", () => ({
  verifyAppleNotification: async () => ({
    notification_type: "consent-revoked",
    sub: "apple-sub",
    email: "test@apple.com",
    event_time: Date.now()
  })
}));

vi.mock("~/server/apple-notification-store", () => ({
  storeAppleNotificationUser: async () => undefined
}));

describe("apple notification router", () => {
  it("verifies and stores notifications", async () => {
    const ctx = await createTRPCContext({
      nativeEvent: { node: { req: {} } }
    } as any);
    const caller = createCallerFactory(ctx);

    const result = await caller.appleNotifications.verifyAndStore.mutate({
      signedPayload: "test"
    });

    expect(result.success).toBe(true);
  });
});
