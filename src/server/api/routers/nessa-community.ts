import { createTRPCRouter, nessaProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { NessaConnectionFactory } from "~/server/database";
import { sanitizeCommunityContent } from "~/server/lib/sanitize";
import {
  requireClubMembership,
  resolveClubIdFromPost,
  resolveClubIdFromChallenge
} from "./nessa-community-authz";

/**
 * nessa.community.* — Community features (clubs, challenges, social feed).
 *
 * This router ports the standalone `nessa-api/` Express prototype into the
 * freno-dev tRPC surface so freno-dev acts as the live API for Nessa's
 * community features. All procedures are JWT-authed via `nessaProcedure`
 * (`ctx.nessaUserId` is the calling user) and operate on the REAL Nessa schema
 * (camelCase tables: `clubs`, `clubMemberships`, `clubChallenges`,
 * `clubChallengeParticipations`, `clubPosts`, `clubPostLikes`,
 * `clubPostComments`).
 *
 * Migration notes from the prototype (`nessa-api/`, which used a separate
 * better-sqlite3 DB with snake_case tables):
 *  - `creatorId`/`userId` are no longer passed by the client; they come from
 *    `ctx.nessaUserId`.
 *  - Prototype "challenges" (standalone) → real schema's `clubChallenges`
 *    (club-scoped, goal-driven). Prototype "submissions" (data+proof) map to
 *    `clubChallengeParticipations.progress` + `isCompleted`/`completedAt`,
 *    which is the shape the production schema supports.
 *  - Prototype "social" (posts/likes/comments) → new `clubPosts`/
 *    `clubPostLikes`/`clubPostComments` tables (added to schema.sql), scoped
 *    to a club.
 */

const NESSA_COMMUNITY_CACHE_TTL_MS = 2 * 60 * 1000;

// ---------------------------------------------------------------------------
// Shared input schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

const idSchema = z.object({ id: z.string().min(1) });

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

const clubListSchema = paginationSchema.extend({
  clubType: z.string().optional(),
  privacy: z.enum(["public", "private"]).optional(),
  search: z.string().optional()
});

const clubCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
  clubType: z.string().min(1),
  privacy: z.enum(["public", "private"]).default("public"),
  location: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  rules: z.string().nullable().optional(),
  maxMembers: z.number().int().min(1).nullable().optional()
});

const clubUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  clubType: z.string().min(1).optional(),
  privacy: z.enum(["public", "private"]).optional(),
  location: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  rules: z.string().nullable().optional(),
  maxMembers: z.number().int().min(1).nullable().optional(),
  membershipStatus: z.string().optional()
});

// ---------------------------------------------------------------------------
// Challenges (clubChallenges)
// ---------------------------------------------------------------------------

const challengeListSchema = paginationSchema.extend({
  clubId: z.string().min(1).optional(),
  status: z
    .enum(["upcoming", "active", "completed"])
    .optional()
});

const challengeCreateSchema = z.object({
  clubId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  goalType: z.string().min(1),
  goalValue: z.number().min(0),
  startDate: z.string().min(1),
  endDate: z.string().min(1)
});

const challengeUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  goalType: z.string().min(1).optional(),
  goalValue: z.number().min(0).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  status: z.string().optional()
});

const submitProgressSchema = z.object({
  challengeId: z.string().min(1),
  progress: z.number().min(0),
  isCompleted: z.boolean().optional()
});

// ---------------------------------------------------------------------------
// Social (clubPosts / clubPostLikes / clubPostComments)
// ---------------------------------------------------------------------------

const feedSchema = paginationSchema.extend({
  clubId: z.string().min(1).optional()
});

const createPostSchema = z.object({
  clubId: z.string().min(1),
  content: z.string().min(1).max(5000),
  postType: z.string().default("text"),
  challengeId: z.string().min(1).nullable().optional()
});

const commentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(5000)
});

const postLikeSchema = z.object({ postId: z.string().min(1) });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ClubRow {
  id: string;
  name: string;
  description: string | null;
  clubType: string;
  privacy: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  memberCount: number;
  maxMembers: number | null;
  imageUrl: string | null;
  rules: string | null;
  ownerId: string;
  ownerName: string | null;
  membershipStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChallengeRow {
  id: string;
  clubId: string;
  title: string;
  description: string | null;
  goalType: string;
  goalValue: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MemberRow {
  id: string;
  clubId: string;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ParticipationRow {
  id: string;
  challengeId: string;
  userId: string;
  progress: number;
  isCompleted: number;
  completedAt: string | null;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface PostRow {
  id: string;
  clubId: string;
  userId: string;
  content: string;
  postType: string;
  challengeId: string | null;
  createdAt: string;
  updatedAt: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  likeCount: number;
  commentCount: number;
  userLiked: number;
}

interface CommentRow {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
}

// Membership gating helpers (`requireClubMembership`, `resolveClubIdFromPost`,
// `resolveClubIdFromChallenge`) live in `./nessa-community-authz` and are
// shared by every membership-gated endpoint below — see p8-003.

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const nessaCommunityRouter = createTRPCRouter({
  // ==========================================================================
  // Clubs
  // ==========================================================================
  clubs: createTRPCRouter({
    list: nessaProcedure
      .input(clubListSchema)
      .query(async ({ input }) => {
        const limit = input.limit ?? 50;
        const offset = input.offset ?? 0;

        try {
          const conn = NessaConnectionFactory();
          const where: string[] = [];
          const args: (string | number)[] = [];

          if (input.clubType) {
            where.push("clubType = ?");
            args.push(input.clubType);
          }
          if (input.privacy) {
            where.push("privacy = ?");
            args.push(input.privacy);
          }
          if (input.search) {
            where.push("(name LIKE ? OR description LIKE ?)");
            args.push(`%${input.search}%`, `%${input.search}%`);
          }

          const whereClause = where.length
            ? `WHERE ${where.join(" AND ")}`
            : "";
          args.push(limit, offset);

          const result = await conn.execute({
            sql: `SELECT id, name, description, clubType, privacy, location, latitude, longitude,
                    memberCount, maxMembers, imageUrl, rules, ownerId, ownerName,
                    membershipStatus, createdAt, updatedAt
                  FROM clubs ${whereClause}
                  ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
            args
          });

          return { clubs: result.rows as unknown as ClubRow[] };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to list Nessa clubs:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list clubs"
          });
        }
      }),

    get: nessaProcedure
      .input(idSchema)
      .query(async ({ input }) => {
        try {
          const conn = NessaConnectionFactory();
          const result = await conn.execute({
            sql: `SELECT id, name, description, clubType, privacy, location, latitude, longitude,
                    memberCount, maxMembers, imageUrl, rules, ownerId, ownerName,
                    membershipStatus, createdAt, updatedAt
                  FROM clubs WHERE id = ?`,
            args: [input.id]
          });
          if (!result.rows.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Club not found" });
          }
          return { club: result.rows[0] as unknown as ClubRow };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to get Nessa club:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get club"
          });
        }
      }),

    create: nessaProcedure
      .input(clubCreateSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();

          // Resolve owner display name for denormalized ownerName.
          const userRow = await conn.execute({
            sql: "SELECT displayName, firstName, lastName FROM users WHERE id = ?",
            args: [ctx.nessaUserId]
          });
          if (!userRow.rows.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Creating user not found"
            });
          }
          const u = userRow.rows[0] as unknown as {
            displayName: string | null;
            firstName: string | null;
            lastName: string | null;
          };
          const ownerName =
            u.displayName ??
            [u.firstName, u.lastName].filter(Boolean).join(" ") ??
            null;

          const clubId = crypto.randomUUID();
          await conn.execute({
            sql: `INSERT INTO clubs
                    (id, name, description, clubType, privacy, location, latitude, longitude,
                     memberCount, maxMembers, imageUrl, rules, ownerId, ownerName, membershipStatus)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              clubId,
              input.name,
              input.description ?? null,
              input.clubType,
              input.privacy,
              input.location ?? null,
              input.latitude ?? null,
              input.longitude ?? null,
              1, // memberCount: owner
              input.maxMembers ?? null,
              input.imageUrl ?? null,
              input.rules ?? null,
              ctx.nessaUserId,
              ownerName,
              "active"
            ]
          });

          // Owner is automatically a member with role 'owner'.
          await conn.execute({
            sql: `INSERT INTO clubMemberships (id, clubId, userId, role)
                  VALUES (?, ?, ?, 'owner')`,
            args: [crypto.randomUUID(), clubId, ctx.nessaUserId]
          });

          return { success: true, clubId };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to create Nessa club:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create club"
          });
        }
      }),

    update: nessaProcedure
      .input(clubUpdateSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();

          // Only the owner may update.
          const ownerCheck = await conn.execute({
            sql: "SELECT ownerId FROM clubs WHERE id = ?",
            args: [input.id]
          });
          if (!ownerCheck.rows.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Club not found" });
          }
          if ((ownerCheck.rows[0] as unknown as { ownerId: string }).ownerId !== ctx.nessaUserId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the club owner can update the club"
            });
          }

          const fields: string[] = [];
          const args: (string | number | null)[] = [];
          const map: Record<string, string> = {
            name: "name",
            description: "description",
            clubType: "clubType",
            privacy: "privacy",
            location: "location",
            latitude: "latitude",
            longitude: "longitude",
            imageUrl: "imageUrl",
            rules: "rules",
            maxMembers: "maxMembers",
            membershipStatus: "membershipStatus"
          };
          for (const [key, col] of Object.entries(map)) {
            if ((input as Record<string, unknown>)[key] !== undefined) {
              fields.push(`${col} = ?`);
              args.push((input as Record<string, unknown>)[key] as string | number | null);
            }
          }

          if (fields.length === 0) {
            return { success: true };
          }
          fields.push("updatedAt = datetime('now')");
          args.push(input.id);

          await conn.execute({
            sql: `UPDATE clubs SET ${fields.join(", ")} WHERE id = ?`,
            args
          });
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to update Nessa club:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update club"
          });
        }
      }),

    delete: nessaProcedure
      .input(idSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const ownerCheck = await conn.execute({
            sql: "SELECT ownerId FROM clubs WHERE id = ?",
            args: [input.id]
          });
          if (!ownerCheck.rows.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Club not found" });
          }
          if ((ownerCheck.rows[0] as unknown as { ownerId: string }).ownerId !== ctx.nessaUserId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the club owner can delete the club"
            });
          }
          await conn.execute({
            sql: "DELETE FROM clubs WHERE id = ?",
            args: [input.id]
          });
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to delete Nessa club:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete club"
          });
        }
      }),

    members: nessaProcedure
      .input(idSchema)
      .query(async ({ input }) => {
        try {
          const conn = NessaConnectionFactory();
          const result = await conn.execute({
            sql: `SELECT cm.id, cm.clubId, cm.userId, cm.role, cm.joinedAt,
                    u.firstName, u.lastName, u.displayName, u.avatarUrl
                  FROM clubMemberships cm
                  JOIN users u ON cm.userId = u.id
                  WHERE cm.clubId = ?
                  ORDER BY cm.joinedAt ASC`,
            args: [input.id]
          });
          return { members: result.rows as unknown as MemberRow[] };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to list club members:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list club members"
          });
        }
      }),

    join: nessaProcedure
      .input(idSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();

          const existing = await conn.execute({
            sql: "SELECT id FROM clubMemberships WHERE clubId = ? AND userId = ?",
            args: [input.id, ctx.nessaUserId]
          });
          if (existing.rows.length) {
            throw new TRPCError({ code: "CONFLICT", message: "Already a member" });
          }

          const capacity = await conn.execute({
            sql: "SELECT maxMembers, memberCount FROM clubs WHERE id = ?",
            args: [input.id]
          });
          if (!capacity.rows.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Club not found" });
          }
          const cap = capacity.rows[0] as unknown as {
            maxMembers: number | null;
            memberCount: number;
          };
          if (cap.maxMembers && cap.memberCount >= cap.maxMembers) {
            throw new TRPCError({ code: "CONFLICT", message: "Club is full" });
          }

          await conn.execute({
            sql: `INSERT INTO clubMemberships (id, clubId, userId, role)
                  VALUES (?, ?, ?, 'member')`,
            args: [crypto.randomUUID(), input.id, ctx.nessaUserId]
          });
          await conn.execute({
            sql: "UPDATE clubs SET memberCount = memberCount + 1, updatedAt = datetime('now') WHERE id = ?",
            args: [input.id]
          });

          return {
            success: true,
            clubId: input.id,
            userId: ctx.nessaUserId,
            role: "member"
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to join Nessa club:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to join club"
          });
        }
      }),

    leave: nessaProcedure
      .input(idSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();

          const membership = await conn.execute({
            sql: "SELECT role FROM clubMemberships WHERE clubId = ? AND userId = ?",
            args: [input.id, ctx.nessaUserId]
          });
          if (!membership.rows.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found" });
          }
          if ((membership.rows[0] as unknown as { role: string }).role === "owner") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Owner cannot leave; transfer ownership or delete the club"
            });
          }

          await conn.execute({
            sql: "DELETE FROM clubMemberships WHERE clubId = ? AND userId = ?",
            args: [input.id, ctx.nessaUserId]
          });
          await conn.execute({
            sql: "UPDATE clubs SET memberCount = MAX(memberCount - 1, 0), updatedAt = datetime('now') WHERE id = ?",
            args: [input.id]
          });

          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to leave Nessa club:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to leave club"
          });
        }
      })
  }),

  // ==========================================================================
  // Challenges (clubChallenges)
  // ==========================================================================
  challenges: createTRPCRouter({
    list: nessaProcedure
      .input(challengeListSchema)
      .query(async ({ input }) => {
        const limit = input.limit ?? 50;
        const offset = input.offset ?? 0;

        try {
          const conn = NessaConnectionFactory();
          const where: string[] = [];
          const args: (string | number)[] = [];

          if (input.clubId) {
            where.push("clubId = ?");
            args.push(input.clubId);
          }
          if (input.status) {
            where.push("status = ?");
            args.push(input.status);
          }

          const whereClause = where.length
            ? `WHERE ${where.join(" AND ")}`
            : "";
          args.push(limit, offset);

          const result = await conn.execute({
            sql: `SELECT id, clubId, title, description, goalType, goalValue,
                    startDate, endDate, createdBy, status, createdAt, updatedAt
                  FROM clubChallenges ${whereClause}
                  ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
            args
          });

          return { challenges: result.rows as unknown as ChallengeRow[] };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to list Nessa challenges:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list challenges"
          });
        }
      }),

    get: nessaProcedure
      .input(idSchema)
      .query(async ({ input }) => {
        try {
          const conn = NessaConnectionFactory();
          const result = await conn.execute({
            sql: `SELECT id, clubId, title, description, goalType, goalValue,
                    startDate, endDate, createdBy, status, createdAt, updatedAt
                  FROM clubChallenges WHERE id = ?`,
            args: [input.id]
          });
          if (!result.rows.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Challenge not found"
            });
          }
          return { challenge: result.rows[0] as unknown as ChallengeRow };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to get Nessa challenge:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get challenge"
          });
        }
      }),

    create: nessaProcedure
      .input(challengeCreateSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          await requireClubMembership(conn, input.clubId, ctx.nessaUserId);

          const challengeId = crypto.randomUUID();
          await conn.execute({
            sql: `INSERT INTO clubChallenges
                    (id, clubId, title, description, goalType, goalValue,
                     startDate, endDate, createdBy, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')`,
            args: [
              challengeId,
              input.clubId,
              input.title,
              input.description ?? null,
              input.goalType,
              input.goalValue,
              input.startDate,
              input.endDate,
              ctx.nessaUserId
            ]
          });

          return { success: true, challengeId };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to create Nessa challenge:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create challenge"
          });
        }
      }),

    update: nessaProcedure
      .input(challengeUpdateSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();

          const ownerCheck = await conn.execute({
            sql: "SELECT createdBy FROM clubChallenges WHERE id = ?",
            args: [input.id]
          });
          if (!ownerCheck.rows.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Challenge not found"
            });
          }
          if (
            (ownerCheck.rows[0] as unknown as { createdBy: string }).createdBy !==
            ctx.nessaUserId
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the creator can update the challenge"
            });
          }

          const fields: string[] = [];
          const args: (string | number | null)[] = [];
          const map: Record<string, string> = {
            title: "title",
            description: "description",
            goalType: "goalType",
            goalValue: "goalValue",
            startDate: "startDate",
            endDate: "endDate",
            status: "status"
          };
          for (const [key, col] of Object.entries(map)) {
            if ((input as Record<string, unknown>)[key] !== undefined) {
              fields.push(`${col} = ?`);
              args.push(
                (input as Record<string, unknown>)[key] as string | number | null
              );
            }
          }
          if (fields.length === 0) {
            return { success: true };
          }
          fields.push("updatedAt = datetime('now')");
          args.push(input.id);

          await conn.execute({
            sql: `UPDATE clubChallenges SET ${fields.join(", ")} WHERE id = ?`,
            args
          });
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to update Nessa challenge:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update challenge"
          });
        }
      }),

    delete: nessaProcedure
      .input(idSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const ownerCheck = await conn.execute({
            sql: "SELECT createdBy FROM clubChallenges WHERE id = ?",
            args: [input.id]
          });
          if (!ownerCheck.rows.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Challenge not found"
            });
          }
          if (
            (ownerCheck.rows[0] as unknown as { createdBy: string }).createdBy !==
            ctx.nessaUserId
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the creator can delete the challenge"
            });
          }
          await conn.execute({
            sql: "DELETE FROM clubChallenges WHERE id = ?",
            args: [input.id]
          });
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to delete Nessa challenge:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete challenge"
          });
        }
      }),

    participants: nessaProcedure
      .input(idSchema)
      .query(async ({ input }) => {
        try {
          const conn = NessaConnectionFactory();
          const result = await conn.execute({
            sql: `SELECT cp.id, cp.challengeId, cp.userId, cp.progress, cp.isCompleted,
                    cp.completedAt, cp.joinedAt,
                    u.firstName, u.lastName, u.displayName, u.avatarUrl
                  FROM clubChallengeParticipations cp
                  JOIN users u ON cp.userId = u.id
                  WHERE cp.challengeId = ?
                  ORDER BY cp.joinedAt ASC`,
            args: [input.id]
          });
          return { participants: result.rows as unknown as ParticipationRow[] };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to list challenge participants:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list participants"
          });
        }
      }),

    leaderboard: nessaProcedure
      .input(idSchema)
      .query(async ({ input }) => {
        try {
          const conn = NessaConnectionFactory();
          const result = await conn.execute({
            sql: `SELECT cp.id, cp.challengeId, cp.userId, cp.progress, cp.isCompleted,
                    cp.completedAt, cp.joinedAt,
                    u.firstName, u.lastName, u.displayName, u.avatarUrl
                  FROM clubChallengeParticipations cp
                  JOIN users u ON cp.userId = u.id
                  WHERE cp.challengeId = ?
                  ORDER BY cp.progress DESC, cp.joinedAt ASC`,
            args: [input.id]
          });
          return { leaderboard: result.rows as unknown as ParticipationRow[] };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to fetch challenge leaderboard:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch leaderboard"
          });
        }
      }),

    join: nessaProcedure
      .input(idSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();

          const challenge = await conn.execute({
            sql: "SELECT clubId FROM clubChallenges WHERE id = ?",
            args: [input.id]
          });
          if (!challenge.rows.length) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Challenge not found"
            });
          }
          const clubId = (challenge.rows[0] as unknown as { clubId: string }).clubId;
          await requireClubMembership(conn, clubId, ctx.nessaUserId);

          const existing = await conn.execute({
            sql: "SELECT id FROM clubChallengeParticipations WHERE challengeId = ? AND userId = ?",
            args: [input.id, ctx.nessaUserId]
          });
          if (existing.rows.length) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Already a participant"
            });
          }

          await conn.execute({
            sql: `INSERT INTO clubChallengeParticipations (id, challengeId, userId, progress, isCompleted)
                  VALUES (?, ?, ?, 0, 0)`,
            args: [crypto.randomUUID(), input.id, ctx.nessaUserId]
          });

          return {
            success: true,
            challengeId: input.id,
            userId: ctx.nessaUserId,
            status: "active"
          };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to join Nessa challenge:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to join challenge"
          });
        }
      }),

    leave: nessaProcedure
      .input(idSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const clubId = await resolveClubIdFromChallenge(conn, input.id);
          await requireClubMembership(conn, clubId, ctx.nessaUserId);
          await conn.execute({
            sql: "DELETE FROM clubChallengeParticipations WHERE challengeId = ? AND userId = ?",
            args: [input.id, ctx.nessaUserId]
          });
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to leave Nessa challenge:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to leave challenge"
          });
        }
      }),

    submitProgress: nessaProcedure
      .input(submitProgressSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const clubId = await resolveClubIdFromChallenge(
            conn,
            input.challengeId
          );
          await requireClubMembership(conn, clubId, ctx.nessaUserId);

          // Upsert participation: create if absent, update progress.
          const existing = await conn.execute({
            sql: "SELECT id FROM clubChallengeParticipations WHERE challengeId = ? AND userId = ?",
            args: [input.challengeId, ctx.nessaUserId]
          });

          if (existing.rows.length) {
            const completed = input.isCompleted
              ? ", isCompleted = 1, completedAt = datetime('now')"
              : "";
            await conn.execute({
              sql: `UPDATE clubChallengeParticipations
                    SET progress = ?${completed}
                    WHERE challengeId = ? AND userId = ?`,
              args: [input.progress, input.challengeId, ctx.nessaUserId]
            });
          } else {
            await conn.execute({
              sql: `INSERT INTO clubChallengeParticipations
                      (id, challengeId, userId, progress, isCompleted, completedAt)
                    VALUES (?, ?, ?, ?, ?, ?)`,
              args: [
                crypto.randomUUID(),
                input.challengeId,
                ctx.nessaUserId,
                input.progress,
                input.isCompleted ? 1 : 0,
                input.isCompleted ? new Date().toISOString() : null
              ]
            });
          }

          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to submit Nessa challenge progress:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to submit progress"
          });
        }
      })
  }),

  // ==========================================================================
  // Social (clubPosts / clubPostLikes / clubPostComments)
  // ==========================================================================
  social: createTRPCRouter({
    feed: nessaProcedure
      .input(feedSchema)
      .query(async ({ input, ctx }) => {
        const limit = input.limit ?? 20;
        const offset = input.offset ?? 0;

        try {
          const conn = NessaConnectionFactory();

          // If a clubId is given, require membership; otherwise aggregate
          // posts across all clubs the user belongs to.
          let clubScope: string;
          let scopeArgs: (string | number)[];
          if (input.clubId) {
            await requireClubMembership(conn, input.clubId, ctx.nessaUserId);
            clubScope = "p.clubId = ?";
            scopeArgs = [input.clubId];
          } else {
            clubScope =
              "p.clubId IN (SELECT clubId FROM clubMemberships WHERE userId = ?)";
            scopeArgs = [ctx.nessaUserId];
          }

          scopeArgs.push(ctx.nessaUserId, limit, offset);

          const result = await conn.execute({
            sql: `SELECT p.id, p.clubId, p.userId, p.content, p.postType, p.challengeId,
                    p.createdAt, p.updatedAt,
                    u.displayName AS authorDisplayName, u.avatarUrl AS authorAvatarUrl,
                    (SELECT COUNT(*) FROM clubPostLikes WHERE postId = p.id) AS likeCount,
                    (SELECT COUNT(*) FROM clubPostComments WHERE postId = p.id) AS commentCount,
                    (SELECT COUNT(*) FROM clubPostLikes WHERE postId = p.id AND userId = ?) AS userLiked
                  FROM clubPosts p
                  JOIN users u ON p.userId = u.id
                  WHERE ${clubScope}
                  ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`,
            args: scopeArgs
          });

          return { posts: result.rows as unknown as PostRow[] };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to fetch Nessa social feed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch feed"
          });
        }
      }),

    createPost: nessaProcedure
      .input(createPostSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          await requireClubMembership(conn, input.clubId, ctx.nessaUserId);

          // Sanitize content before storage — strip all HTML (p8-012).
          // Community content is plain text; the iOS client renders with
          // SwiftUI Text(), not a WebView.
          const content = sanitizeCommunityContent(input.content);

          const postId = crypto.randomUUID();
          await conn.execute({
            sql: `INSERT INTO clubPosts (id, clubId, userId, content, postType, challengeId)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              postId,
              input.clubId,
              ctx.nessaUserId,
              content,
              input.postType,
              input.challengeId ?? null
            ]
          });
          return { success: true, postId };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to create Nessa post:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create post"
          });
        }
      }),

    getPost: nessaProcedure
      .input(idSchema)
      .query(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const clubId = await resolveClubIdFromPost(conn, input.id);
          await requireClubMembership(conn, clubId, ctx.nessaUserId);
          const result = await conn.execute({
            sql: `SELECT p.id, p.clubId, p.userId, p.content, p.postType, p.challengeId,
                    p.createdAt, p.updatedAt,
                    u.displayName AS authorDisplayName, u.avatarUrl AS authorAvatarUrl,
                    (SELECT COUNT(*) FROM clubPostLikes WHERE postId = p.id) AS likeCount,
                    (SELECT COUNT(*) FROM clubPostComments WHERE postId = p.id) AS commentCount,
                    (SELECT COUNT(*) FROM clubPostLikes WHERE postId = p.id AND userId = ?) AS userLiked
                  FROM clubPosts p
                  JOIN users u ON p.userId = u.id
                  WHERE p.id = ?`,
            args: [ctx.nessaUserId, input.id]
          });
          if (!result.rows.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
          }
          return { post: result.rows[0] as unknown as PostRow };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to get Nessa post:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get post"
          });
        }
      }),

    deletePost: nessaProcedure
      .input(idSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const ownerCheck = await conn.execute({
            sql: "SELECT userId FROM clubPosts WHERE id = ?",
            args: [input.id]
          });
          if (!ownerCheck.rows.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
          }
          if ((ownerCheck.rows[0] as unknown as { userId: string }).userId !== ctx.nessaUserId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only the author can delete the post"
            });
          }
          await conn.execute({
            sql: "DELETE FROM clubPosts WHERE id = ?",
            args: [input.id]
          });
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to delete Nessa post:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete post"
          });
        }
      }),

    like: nessaProcedure
      .input(postLikeSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const clubId = await resolveClubIdFromPost(conn, input.postId);
          await requireClubMembership(conn, clubId, ctx.nessaUserId);
          const existing = await conn.execute({
            sql: "SELECT id FROM clubPostLikes WHERE postId = ? AND userId = ?",
            args: [input.postId, ctx.nessaUserId]
          });
          if (existing.rows.length) {
            throw new TRPCError({ code: "CONFLICT", message: "Already liked" });
          }
          await conn.execute({
            sql: "INSERT INTO clubPostLikes (id, postId, userId) VALUES (?, ?, ?)",
            args: [crypto.randomUUID(), input.postId, ctx.nessaUserId]
          });
          return { success: true, postId: input.postId, userId: ctx.nessaUserId };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to like Nessa post:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to like post"
          });
        }
      }),

    unlike: nessaProcedure
      .input(postLikeSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const clubId = await resolveClubIdFromPost(conn, input.postId);
          await requireClubMembership(conn, clubId, ctx.nessaUserId);
          await conn.execute({
            sql: "DELETE FROM clubPostLikes WHERE postId = ? AND userId = ?",
            args: [input.postId, ctx.nessaUserId]
          });
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to unlike Nessa post:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to unlike post"
          });
        }
      }),

    addComment: nessaProcedure
      .input(commentSchema)
      .mutation(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const clubId = await resolveClubIdFromPost(conn, input.postId);
          await requireClubMembership(conn, clubId, ctx.nessaUserId);

          // Sanitize content before storage — strip all HTML (p8-012).
          const content = sanitizeCommunityContent(input.content);

          const commentId = crypto.randomUUID();
          await conn.execute({
            sql: `INSERT INTO clubPostComments (id, postId, userId, content)
                  VALUES (?, ?, ?, ?)`,
            args: [commentId, input.postId, ctx.nessaUserId, content]
          });
          return { success: true, commentId };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to add Nessa comment:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add comment"
          });
        }
      }),

    comments: nessaProcedure
      .input(postLikeSchema)
      .query(async ({ input, ctx }) => {
        try {
          const conn = NessaConnectionFactory();
          const clubId = await resolveClubIdFromPost(conn, input.postId);
          await requireClubMembership(conn, clubId, ctx.nessaUserId);
          const result = await conn.execute({
            sql: `SELECT c.id, c.postId, c.userId, c.content, c.createdAt, c.updatedAt,
                    u.displayName AS authorDisplayName, u.avatarUrl AS authorAvatarUrl
                  FROM clubPostComments c
                  JOIN users u ON c.userId = u.id
                  WHERE c.postId = ?
                  ORDER BY c.createdAt ASC`,
            args: [input.postId]
          });
          return { comments: result.rows as unknown as CommentRow[] };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Failed to list Nessa post comments:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to list comments"
          });
        }
      })
  })
});
