import { describe, it, expect, vi } from "vitest";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/utils";

vi.mock("~/server/database", () => ({
  CairnConnectionFactory: () => ({
    execute: async () => ({ rows: [{ id: "1", email: "test@cairn.app" }] })
  })
}));

vi.mock("~/server/cache", () => ({
  cache: {
    get: async () => null,
    set: async () => undefined
  }
}));

vi.mock("~/server/session-helpers", () => ({
  getAuthSession: async () => ({ userId: "admin", isAdmin: true })
}));

describe("remoteDb router", () => {
  it("returns users from remote database", async () => {
    const caller = appRouter.createCaller(
      await createTRPCContext({ nativeEvent: { node: { req: {} } } } as any)
    );

    const result = await caller.remoteDb.getUsers.query({ limit: 1, offset: 0 });

    expect(result.users.length).toBe(1);
    expect(result.users[0].email).toBe("test@cairn.app");
  });
});
