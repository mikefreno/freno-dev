import { wrap } from "@typeschema/valibot";
import { string } from "valibot";
import { 
  createTRPCRouter, 
  publicProcedure, 
  protectedProcedure,
  adminProcedure 
} from "../utils";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(wrap(string()))
    .query(({ input }) => {
      return `Hello ${input}!`;
    }),
  
  // Example of a protected procedure (requires authentication)
  getProfile: protectedProcedure.query(({ ctx }) => {
    return {
      userId: ctx.userId,
      privilegeLevel: ctx.privilegeLevel,
      message: "You are authenticated!",
    };
  }),

  // Example of an admin-only procedure
  adminDashboard: adminProcedure.query(({ ctx }) => {
    return {
      userId: ctx.userId,
      message: "Welcome to the admin dashboard!",
      isAdmin: true,
    };
  }),
});
