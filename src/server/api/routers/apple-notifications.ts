import { createTRPCRouter, adminProcedure } from "../utils";
import { z } from "zod";
import { verifyAppleNotification } from "~/server/apple-notification";
import { storeAppleNotificationUser } from "~/server/apple-notification-store";

export const appleNotificationsRouter = createTRPCRouter({
  verifyAndStore: adminProcedure
    .input(z.record(z.unknown()))
    .mutation(async ({ input }) => {
      const notification = await verifyAppleNotification(input);
      await storeAppleNotificationUser(notification);
      return { success: true };
    })
});
