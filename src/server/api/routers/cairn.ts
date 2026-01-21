import { createTRPCRouter, cairnProcedure, publicProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { CairnConnectionFactory } from "~/server/database";
import { cache } from "~/server/cache";
import { hashPassword, checkPasswordSafe } from "~/server/utils";
import { signCairnToken } from "~/server/cairn-auth";

const CAIRN_CACHE_TTL_MS = 5 * 60 * 1000;

const paginatedQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  since: z.string().optional()
});

const planIdSchema = z.object({ id: z.string().min(1) });
const userIdSchema = z.object({ id: z.string().min(1) });
const workoutIdSchema = z.object({ id: z.string().min(1) });
const exerciseIdSchema = z.object({ id: z.string().min(1) });
const planExerciseIdSchema = z.object({ id: z.string().min(1) });
const planSetIdSchema = z.object({ id: z.string().min(1) });
const routePointIdSchema = z.object({ id: z.string().min(1) });

const userInputSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().nullable().optional(),
  emailVerified: z.number().int().min(0).max(1).optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  provider: z.string().nullable().optional(),
  appleUserId: z.string().nullable().optional(),
  status: z.string().optional()
});

const exerciseLibrarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  muscleGroups: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  defaultSets: z.number().int().nullable().optional(),
  defaultReps: z.number().int().nullable().optional(),
  defaultRestSeconds: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional()
});

const workoutPlanSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  difficulty: z.string().optional(),
  durationMinutes: z.number().int().nullable().optional(),
  type: z.string().min(1),
  isPublic: z.number().int().min(0).max(1).optional()
});

const planExerciseSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  exerciseId: z.string().nullable().optional(),
  name: z.string().min(1),
  category: z.string().min(1),
  orderIndex: z.number().int(),
  notes: z.string().nullable().optional()
});

const planSetSchema = z.object({
  id: z.string().min(1),
  planExerciseId: z.string().min(1),
  setNumber: z.number().int(),
  reps: z.number().int().nullable().optional(),
  weight: z.number().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  rpe: z.number().nullable().optional(),
  restAfterSeconds: z.number().int().nullable().optional(),
  isWarmup: z.number().int().min(0).max(1).optional(),
  isDropset: z.number().int().min(0).max(1).optional(),
  notes: z.string().nullable().optional()
});

const routePointSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  orderIndex: z.number().int(),
  isWaypoint: z.number().int().min(0).max(1).optional()
});

const workoutSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  planId: z.string().nullable().optional(),
  type: z.string().min(1),
  name: z.string().nullable().optional(),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  durationSeconds: z.number().nullable().optional(),
  distanceMeters: z.number().nullable().optional(),
  calories: z.number().nullable().optional(),
  averageHeartRate: z.number().nullable().optional(),
  maxHeartRate: z.number().nullable().optional(),
  averagePace: z.number().nullable().optional(),
  elevationGain: z.number().nullable().optional(),
  status: z.string().min(1),
  source: z.string().min(1),
  healthKitUUID: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

const heartRateSchema = z.object({
  id: z.string().min(1),
  workoutId: z.string().min(1),
  timestamp: z.string().min(1),
  bpm: z.number(),
  source: z.string().nullable().optional()
});

const locationSampleSchema = z.object({
  id: z.string().min(1),
  workoutId: z.string().min(1),
  timestamp: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number().nullable().optional(),
  horizontalAccuracy: z.number().nullable().optional(),
  verticalAccuracy: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
  course: z.number().nullable().optional()
});

const workoutSplitSchema = z.object({
  id: z.string().min(1),
  workoutId: z.string().min(1),
  splitNumber: z.number().int(),
  distanceMeters: z.number(),
  durationSeconds: z.number(),
  startTimestamp: z.string().min(1),
  endTimestamp: z.string().min(1),
  averageHeartRate: z.number().nullable().optional(),
  averagePace: z.number().nullable().optional(),
  elevationGain: z.number().nullable().optional(),
  elevationLoss: z.number().nullable().optional()
});

const providerSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  provider: z.string().min(1),
  providerUserId: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional()
});

const bulkSchema = z.object({
  users: z.array(userInputSchema).optional(),
  workoutPlans: z.array(workoutPlanSchema).optional(),
  planExercises: z.array(planExerciseSchema).optional(),
  planSets: z.array(planSetSchema).optional(),
  routePoints: z.array(routePointSchema).optional(),
  workouts: z.array(workoutSchema).optional(),
  heartRateSamples: z.array(heartRateSchema).optional(),
  locationSamples: z.array(locationSampleSchema).optional(),
  workoutSplits: z.array(workoutSplitSchema).optional(),
  exerciseLibrary: z.array(exerciseLibrarySchema).optional(),
  authProviders: z.array(providerSchema).optional()
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const cairnDbRouter = createTRPCRouter({
  health: cairnProcedure.query(async () => {
    try {
      const conn = CairnConnectionFactory();
      const result = await conn.execute("SELECT 1 as ok");
      return { success: true, ok: result.rows.length > 0 };
    } catch (error) {
      console.error("Cairn remote DB health check failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Remote database health check failed"
      });
    }
  }),

  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        const existing = await conn.execute({
          sql: "SELECT id FROM users WHERE email = ?",
          args: [input.email]
        });

        if (existing.rows.length) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already registered"
          });
        }

        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(input.password);
        await conn.execute({
          sql: `INSERT INTO users (id, email, emailVerified, firstName, lastName, displayName, provider, status, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          args: [
            userId,
            input.email,
            0,
            input.firstName,
            input.lastName,
            `${input.firstName} ${input.lastName}`.trim(),
            "email",
            "active"
          ]
        });
        await conn.execute({
          sql: "INSERT INTO authProviders (id, userId, provider, providerUserId, email, displayName, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [
            crypto.randomUUID(),
            userId,
            "email",
            null,
            input.email,
            null,
            null
          ]
        });
        await conn.execute({
          sql: "INSERT INTO authProviders (id, userId, provider, providerUserId, email, displayName, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [
            crypto.randomUUID(),
            userId,
            "password",
            passwordHash,
            input.email,
            null,
            null
          ]
        });
        await conn.execute({
          sql: "INSERT INTO workoutPlans (id, userId, name, category, difficulty, type, isPublic) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [
            crypto.randomUUID(),
            userId,
            "Getting Started",
            "strength",
            "beginner",
            "strength",
            0
          ]
        });

        const token = await signCairnToken(userId);
        return { success: true, token, userId };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Failed to register Cairn user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to register user"
        });
      }
    }),

  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    try {
      const conn = CairnConnectionFactory();
      const result = await conn.execute({
        sql: "SELECT userId, email, provider, providerUserId FROM authProviders WHERE email = ? AND provider IN ('email', 'password')",
        args: [input.email]
      });

      if (!result.rows.length) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials"
        });
      }

      const rows = result.rows as Array<{
        userId: string;
        email: string | null;
        provider: string;
        providerUserId: string | null;
      }>;
      const emailProvider = rows.find((row) => row.provider === "email");
      const passwordProvider = rows.find((row) => row.provider === "password");

      if (emailProvider?.userId !== passwordProvider?.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials"
        });
      }

      if (!emailProvider || !passwordProvider) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials"
        });
      }

      const matches = await checkPasswordSafe(
        input.password,
        passwordProvider.providerUserId
      );
      if (!matches) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials"
        });
      }

      const token = await signCairnToken(emailProvider.userId);
      await conn.execute({
        sql: "UPDATE users SET lastLoginAt = datetime('now'), updatedAt = datetime('now') WHERE id = ?",
        args: [emailProvider.userId]
      });

      return { success: true, token, userId: emailProvider.userId };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      console.error("Failed to login Cairn user:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to login"
      });
    }
  }),

  getUsers: cairnProcedure
    .input(paginatedQuerySchema)
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-users:${ctx.cairnUserId}:${limit}:${offset}:${input.since ?? ""}`;

      const cached = await cache.get<{
        users: Array<{ id: string; email: string | null }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const sql = input.since
          ? "SELECT id, email FROM users WHERE id = ? AND updatedAt > ? ORDER BY createdAt DESC LIMIT ? OFFSET ?"
          : "SELECT id, email FROM users WHERE id = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?";
        const args = input.since
          ? [ctx.cairnUserId, input.since, limit, offset]
          : [ctx.cairnUserId, limit, offset];
        const result = await conn.execute({
          sql,
          args
        });

        const payload = {
          users: result.rows as Array<{ id: string; email: string | null }>
        };

        await cache.set(cacheKey, payload, CAIRN_CACHE_TTL_MS);
        return payload;
      } catch (error) {
        console.error("Failed to fetch Cairn users:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Cairn users"
        });
      }
    }),

  getPlans: cairnProcedure
    .input(paginatedQuerySchema)
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-plans:${ctx.cairnUserId}:${limit}:${offset}:${input.since ?? ""}`;

      const cached = await cache.get<{
        plans: Array<{ id: string; name: string; category: string }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const sql = input.since
          ? "SELECT id, name, category FROM workoutPlans WHERE userId = ? AND updatedAt > ? ORDER BY createdAt DESC LIMIT ? OFFSET ?"
          : "SELECT id, name, category FROM workoutPlans WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?";
        const args = input.since
          ? [ctx.cairnUserId, input.since, limit, offset]
          : [ctx.cairnUserId, limit, offset];
        const result = await conn.execute({
          sql,
          args
        });

        const payload = {
          plans: result.rows as Array<{
            id: string;
            name: string;
            category: string;
          }>
        };

        await cache.set(cacheKey, payload, CAIRN_CACHE_TTL_MS);
        return payload;
      } catch (error) {
        console.error("Failed to fetch Cairn plans:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Cairn plans"
        });
      }
    }),

  getPlanDetails: cairnProcedure
    .input(paginatedQuerySchema)
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-plan-details:${ctx.cairnUserId}:${limit}:${offset}:${input.since ?? ""}`;

      const cached = await cache.get<{
        plans: Array<{
          id: string;
          userId: string;
          name: string;
          description: string | null;
          category: string;
          difficulty: string | null;
          durationMinutes: number | null;
          type: string;
          isPublic: number | null;
          createdAt: string;
          updatedAt: string;
        }>;
        planExercises: Array<{
          id: string;
          planId: string;
          exerciseId: string | null;
          name: string;
          category: string;
          orderIndex: number;
          notes: string | null;
          createdAt: string;
        }>;
        planSets: Array<{
          id: string;
          planExerciseId: string;
          setNumber: number;
          reps: number | null;
          weight: number | null;
          durationSeconds: number | null;
          rpe: number | null;
          restAfterSeconds: number | null;
          isWarmup: number | null;
          isDropset: number | null;
          notes: string | null;
          createdAt: string;
        }>;
        routePoints: Array<{
          id: string;
          planId: string;
          latitude: number;
          longitude: number;
          orderIndex: number;
          isWaypoint: number | null;
          createdAt: string;
        }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const planSql = input.since
          ? "SELECT id, userId, name, description, category, difficulty, durationMinutes, type, isPublic, createdAt, updatedAt FROM workoutPlans WHERE userId = ? AND updatedAt > ? ORDER BY createdAt DESC LIMIT ? OFFSET ?"
          : "SELECT id, userId, name, description, category, difficulty, durationMinutes, type, isPublic, createdAt, updatedAt FROM workoutPlans WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?";
        const planArgs = input.since
          ? [ctx.cairnUserId, input.since, limit, offset]
          : [ctx.cairnUserId, limit, offset];
        const planResult = await conn.execute({
          sql: planSql,
          args: planArgs
        });

        const planExercisesSql = input.since
          ? "SELECT id, planId, exerciseId, name, category, orderIndex, notes, createdAt FROM planExercises WHERE planId IN (SELECT id FROM workoutPlans WHERE userId = ? AND updatedAt > ?) ORDER BY orderIndex ASC"
          : "SELECT id, planId, exerciseId, name, category, orderIndex, notes, createdAt FROM planExercises WHERE planId IN (SELECT id FROM workoutPlans WHERE userId = ?) ORDER BY orderIndex ASC";
        const planExercisesArgs = input.since
          ? [ctx.cairnUserId, input.since]
          : [ctx.cairnUserId];
        const planExercisesResult = await conn.execute({
          sql: planExercisesSql,
          args: planExercisesArgs
        });

        const planSetsSql = input.since
          ? "SELECT id, planExerciseId, setNumber, reps, weight, durationSeconds, rpe, restAfterSeconds, isWarmup, isDropset, notes, createdAt FROM planSets WHERE planExerciseId IN (SELECT id FROM planExercises WHERE planId IN (SELECT id FROM workoutPlans WHERE userId = ? AND updatedAt > ?)) ORDER BY setNumber ASC"
          : "SELECT id, planExerciseId, setNumber, reps, weight, durationSeconds, rpe, restAfterSeconds, isWarmup, isDropset, notes, createdAt FROM planSets WHERE planExerciseId IN (SELECT id FROM planExercises WHERE planId IN (SELECT id FROM workoutPlans WHERE userId = ?)) ORDER BY setNumber ASC";
        const planSetsArgs = input.since
          ? [ctx.cairnUserId, input.since]
          : [ctx.cairnUserId];
        const planSetsResult = await conn.execute({
          sql: planSetsSql,
          args: planSetsArgs
        });

        const routePointsSql = input.since
          ? "SELECT id, planId, latitude, longitude, orderIndex, isWaypoint, createdAt FROM routePoints WHERE planId IN (SELECT id FROM workoutPlans WHERE userId = ? AND updatedAt > ?) ORDER BY orderIndex ASC"
          : "SELECT id, planId, latitude, longitude, orderIndex, isWaypoint, createdAt FROM routePoints WHERE planId IN (SELECT id FROM workoutPlans WHERE userId = ?) ORDER BY orderIndex ASC";
        const routePointsArgs = input.since
          ? [ctx.cairnUserId, input.since]
          : [ctx.cairnUserId];
        const routePointsResult = await conn.execute({
          sql: routePointsSql,
          args: routePointsArgs
        });

        const payload = {
          plans: planResult.rows as Array<{
            id: string;
            userId: string;
            name: string;
            description: string | null;
            category: string;
            difficulty: string | null;
            durationMinutes: number | null;
            type: string;
            isPublic: number | null;
            createdAt: string;
            updatedAt: string;
          }>,
          planExercises: planExercisesResult.rows as Array<{
            id: string;
            planId: string;
            exerciseId: string | null;
            name: string;
            category: string;
            orderIndex: number;
            notes: string | null;
            createdAt: string;
          }>,
          planSets: planSetsResult.rows as Array<{
            id: string;
            planExerciseId: string;
            setNumber: number;
            reps: number | null;
            weight: number | null;
            durationSeconds: number | null;
            rpe: number | null;
            restAfterSeconds: number | null;
            isWarmup: number | null;
            isDropset: number | null;
            notes: string | null;
            createdAt: string;
          }>,
          routePoints: routePointsResult.rows as Array<{
            id: string;
            planId: string;
            latitude: number;
            longitude: number;
            orderIndex: number;
            isWaypoint: number | null;
            createdAt: string;
          }>
        };

        await cache.set(cacheKey, payload, CAIRN_CACHE_TTL_MS);
        return payload;
      } catch (error) {
        console.error("Failed to fetch Cairn plan details:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Cairn plan details"
        });
      }
    }),

  getWorkouts: cairnProcedure
    .input(paginatedQuerySchema)
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-workouts:${ctx.cairnUserId}:${limit}:${offset}:${input.since ?? ""}`;

      const cached = await cache.get<{
        workouts: Array<{ id: string; type: string; startDate: string }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const sql = input.since
          ? "SELECT id, type, startDate FROM workouts WHERE userId = ? AND updatedAt > ? ORDER BY startDate DESC LIMIT ? OFFSET ?"
          : "SELECT id, type, startDate FROM workouts WHERE userId = ? ORDER BY startDate DESC LIMIT ? OFFSET ?";
        const args = input.since
          ? [ctx.cairnUserId, input.since, limit, offset]
          : [ctx.cairnUserId, limit, offset];
        const result = await conn.execute({
          sql,
          args
        });

        const payload = {
          workouts: result.rows as Array<{
            id: string;
            type: string;
            startDate: string;
          }>
        };

        await cache.set(cacheKey, payload, CAIRN_CACHE_TTL_MS);
        return payload;
      } catch (error) {
        console.error("Failed to fetch Cairn workouts:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Cairn workouts"
        });
      }
    }),

  getWorkoutDetails: cairnProcedure
    .input(paginatedQuerySchema)
    .query(async ({ input, ctx }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-workout-details:${ctx.cairnUserId}:${limit}:${offset}:${input.since ?? ""}`;

      const cached = await cache.get<{
        workouts: Array<{
          id: string;
          userId: string;
          planId: string | null;
          type: string;
          name: string | null;
          startDate: string;
          endDate: string | null;
          durationSeconds: number | null;
          distanceMeters: number | null;
          calories: number | null;
          averageHeartRate: number | null;
          maxHeartRate: number | null;
          averagePace: number | null;
          elevationGain: number | null;
          status: string;
          source: string;
          healthKitUUID: string | null;
          notes: string | null;
          createdAt: string;
          updatedAt: string;
          syncedAt: string | null;
        }>;
        heartRateSamples: Array<{
          id: string;
          workoutId: string;
          timestamp: string;
          bpm: number;
          source: string | null;
        }>;
        locationSamples: Array<{
          id: string;
          workoutId: string;
          timestamp: string;
          latitude: number;
          longitude: number;
          altitude: number | null;
          horizontalAccuracy: number | null;
          verticalAccuracy: number | null;
          speed: number | null;
          course: number | null;
        }>;
        workoutSplits: Array<{
          id: string;
          workoutId: string;
          splitNumber: number;
          distanceMeters: number;
          durationSeconds: number;
          startTimestamp: string;
          endTimestamp: string;
          averageHeartRate: number | null;
          averagePace: number | null;
          elevationGain: number | null;
          elevationLoss: number | null;
        }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const workoutSql = input.since
          ? "SELECT id, userId, planId, type, name, startDate, endDate, durationSeconds, distanceMeters, calories, averageHeartRate, maxHeartRate, averagePace, elevationGain, status, source, healthKitUUID, notes, createdAt, updatedAt, syncedAt FROM workouts WHERE userId = ? AND updatedAt > ? ORDER BY startDate DESC LIMIT ? OFFSET ?"
          : "SELECT id, userId, planId, type, name, startDate, endDate, durationSeconds, distanceMeters, calories, averageHeartRate, maxHeartRate, averagePace, elevationGain, status, source, healthKitUUID, notes, createdAt, updatedAt, syncedAt FROM workouts WHERE userId = ? ORDER BY startDate DESC LIMIT ? OFFSET ?";
        const workoutArgs = input.since
          ? [ctx.cairnUserId, input.since, limit, offset]
          : [ctx.cairnUserId, limit, offset];
        const workoutResult = await conn.execute({
          sql: workoutSql,
          args: workoutArgs
        });

        const heartRateSql = input.since
          ? "SELECT id, workoutId, timestamp, bpm, source FROM heartRateSamples WHERE workoutId IN (SELECT id FROM workouts WHERE userId = ? AND updatedAt > ?) ORDER BY timestamp ASC"
          : "SELECT id, workoutId, timestamp, bpm, source FROM heartRateSamples WHERE workoutId IN (SELECT id FROM workouts WHERE userId = ?) ORDER BY timestamp ASC";
        const heartRateArgs = input.since
          ? [ctx.cairnUserId, input.since]
          : [ctx.cairnUserId];
        const heartRateResult = await conn.execute({
          sql: heartRateSql,
          args: heartRateArgs
        });

        const locationSql = input.since
          ? "SELECT id, workoutId, timestamp, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, speed, course FROM locationSamples WHERE workoutId IN (SELECT id FROM workouts WHERE userId = ? AND updatedAt > ?) ORDER BY timestamp ASC"
          : "SELECT id, workoutId, timestamp, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, speed, course FROM locationSamples WHERE workoutId IN (SELECT id FROM workouts WHERE userId = ?) ORDER BY timestamp ASC";
        const locationArgs = input.since
          ? [ctx.cairnUserId, input.since]
          : [ctx.cairnUserId];
        const locationResult = await conn.execute({
          sql: locationSql,
          args: locationArgs
        });

        const splitSql = input.since
          ? "SELECT id, workoutId, splitNumber, distanceMeters, durationSeconds, startTimestamp, endTimestamp, averageHeartRate, averagePace, elevationGain, elevationLoss FROM workoutSplits WHERE workoutId IN (SELECT id FROM workouts WHERE userId = ? AND updatedAt > ?) ORDER BY splitNumber ASC"
          : "SELECT id, workoutId, splitNumber, distanceMeters, durationSeconds, startTimestamp, endTimestamp, averageHeartRate, averagePace, elevationGain, elevationLoss FROM workoutSplits WHERE workoutId IN (SELECT id FROM workouts WHERE userId = ?) ORDER BY splitNumber ASC";
        const splitArgs = input.since
          ? [ctx.cairnUserId, input.since]
          : [ctx.cairnUserId];
        const splitResult = await conn.execute({
          sql: splitSql,
          args: splitArgs
        });

        const payload = {
          workouts: workoutResult.rows as Array<{
            id: string;
            userId: string;
            planId: string | null;
            type: string;
            name: string | null;
            startDate: string;
            endDate: string | null;
            durationSeconds: number | null;
            distanceMeters: number | null;
            calories: number | null;
            averageHeartRate: number | null;
            maxHeartRate: number | null;
            averagePace: number | null;
            elevationGain: number | null;
            status: string;
            source: string;
            healthKitUUID: string | null;
            notes: string | null;
            createdAt: string;
            updatedAt: string;
            syncedAt: string | null;
          }>,
          heartRateSamples: heartRateResult.rows as Array<{
            id: string;
            workoutId: string;
            timestamp: string;
            bpm: number;
            source: string | null;
          }>,
          locationSamples: locationResult.rows as Array<{
            id: string;
            workoutId: string;
            timestamp: string;
            latitude: number;
            longitude: number;
            altitude: number | null;
            horizontalAccuracy: number | null;
            verticalAccuracy: number | null;
            speed: number | null;
            course: number | null;
          }>,
          workoutSplits: splitResult.rows as Array<{
            id: string;
            workoutId: string;
            splitNumber: number;
            distanceMeters: number;
            durationSeconds: number;
            startTimestamp: string;
            endTimestamp: string;
            averageHeartRate: number | null;
            averagePace: number | null;
            elevationGain: number | null;
            elevationLoss: number | null;
          }>
        };

        await cache.set(cacheKey, payload, CAIRN_CACHE_TTL_MS);
        return payload;
      } catch (error) {
        console.error("Failed to fetch Cairn workout details:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Cairn workout details"
        });
      }
    }),

  createUser: cairnProcedure
    .input(userInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.id !== ctx.cairnUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
      }
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO users (id, email, emailVerified, firstName, lastName, displayName, avatarUrl, provider, appleUserId, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET email = excluded.email, emailVerified = excluded.emailVerified, firstName = excluded.firstName, lastName = excluded.lastName, displayName = excluded.displayName, avatarUrl = excluded.avatarUrl, provider = excluded.provider, appleUserId = excluded.appleUserId, status = excluded.status, updatedAt = datetime('now')`,
          args: [
            input.id,
            input.email ?? null,
            input.emailVerified ?? 0,
            input.firstName ?? null,
            input.lastName ?? null,
            input.displayName ?? null,
            input.avatarUrl ?? null,
            input.provider ?? null,
            input.appleUserId ?? null,
            input.status ?? "active"
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user"
        });
      }
    }),

  updateUser: cairnProcedure
    .input(userInputSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.id !== ctx.cairnUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
      }
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE users SET email = ?, emailVerified = ?, firstName = ?, lastName = ?, displayName = ?, avatarUrl = ?, provider = ?, appleUserId = ?, status = ?, updatedAt = datetime('now') WHERE id = ?`,
          args: [
            input.email ?? null,
            input.emailVerified ?? 0,
            input.firstName ?? null,
            input.lastName ?? null,
            input.displayName ?? null,
            input.avatarUrl ?? null,
            input.provider ?? null,
            input.appleUserId ?? null,
            input.status ?? "active",
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user"
        });
      }
    }),

  deleteUser: cairnProcedure
    .input(userIdSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.id !== ctx.cairnUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
      }
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: "DELETE FROM users WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete user:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete user"
        });
      }
    }),

  createWorkoutPlan: cairnProcedure
    .input(workoutPlanSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.userId != ctx.cairnUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
      }
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO workoutPlans (id, userId, name, description, category, difficulty, durationMinutes, type, isPublic)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.userId,
            input.name,
            input.description ?? null,
            input.category,
            input.difficulty ?? "intermediate",
            input.durationMinutes ?? null,
            input.type,
            input.isPublic ?? 0
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create workout plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workout plan"
        });
      }
    }),

  updateWorkoutPlan: cairnProcedure
    .input(workoutPlanSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.userId != ctx.cairnUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
      }
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE workoutPlans SET name = ?, description = ?, category = ?, difficulty = ?, durationMinutes = ?, type = ?, isPublic = ?, updatedAt = datetime('now') WHERE id = ?`,
          args: [
            input.name,
            input.description ?? null,
            input.category,
            input.difficulty ?? "intermediate",
            input.durationMinutes ?? null,
            input.type,
            input.isPublic ?? 0,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update workout plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workout plan"
        });
      }
    }),

  deleteWorkoutPlan: cairnProcedure
    .input(planIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const check = await conn.execute({
          sql: "SELECT userId FROM workoutPlans WHERE id = ?",
          args: [input.id]
        });
        if (!check.rows.length || check.rows[0].userId !== ctx.cairnUserId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: "DELETE FROM workoutPlans WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete workout plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workout plan"
        });
      }
    }),

  createPlanExercise: cairnProcedure
    .input(planExerciseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT userId FROM workoutPlans WHERE id = ?",
          args: [input.planId]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: `INSERT INTO planExercises (id, planId, exerciseId, name, category, orderIndex, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.planId,
            input.exerciseId ?? null,
            input.name,
            input.category,
            input.orderIndex,
            input.notes ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create plan exercise:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create plan exercise"
        });
      }
    }),

  updatePlanExercise: cairnProcedure
    .input(planExerciseSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT userId FROM workoutPlans WHERE id = ?",
          args: [input.planId]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: `UPDATE planExercises SET exerciseId = ?, name = ?, category = ?, orderIndex = ?, notes = ? WHERE id = ?`,
          args: [
            input.exerciseId ?? null,
            input.name,
            input.category,
            input.orderIndex,
            input.notes ?? null,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update plan exercise:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update plan exercise"
        });
      }
    }),

  deletePlanExercise: cairnProcedure
    .input(planExerciseIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT workoutPlans.userId FROM workoutPlans INNER JOIN planExercises ON planExercises.planId = workoutPlans.id WHERE planExercises.id = ?",
          args: [input.id]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: "DELETE FROM planExercises WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete plan exercise:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete plan exercise"
        });
      }
    }),

  createPlanSet: cairnProcedure
    .input(planSetSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT workoutPlans.userId FROM workoutPlans INNER JOIN planExercises ON planExercises.planId = workoutPlans.id WHERE planExercises.id = ?",
          args: [input.planExerciseId]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: `INSERT INTO planSets (id, planExerciseId, setNumber, reps, weight, durationSeconds, rpe, restAfterSeconds, isWarmup, isDropset, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.planExerciseId,
            input.setNumber,
            input.reps ?? null,
            input.weight ?? null,
            input.durationSeconds ?? null,
            input.rpe ?? null,
            input.restAfterSeconds ?? null,
            input.isWarmup ?? 0,
            input.isDropset ?? 0,
            input.notes ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create plan set:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create plan set"
        });
      }
    }),

  updatePlanSet: cairnProcedure
    .input(planSetSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT workoutPlans.userId FROM workoutPlans INNER JOIN planExercises ON planExercises.planId = workoutPlans.id INNER JOIN planSets ON planSets.planExerciseId = planExercises.id WHERE planSets.id = ?",
          args: [input.id]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: `UPDATE planSets SET setNumber = ?, reps = ?, weight = ?, durationSeconds = ?, rpe = ?, restAfterSeconds = ?, isWarmup = ?, isDropset = ?, notes = ? WHERE id = ?`,
          args: [
            input.setNumber,
            input.reps ?? null,
            input.weight ?? null,
            input.durationSeconds ?? null,
            input.rpe ?? null,
            input.restAfterSeconds ?? null,
            input.isWarmup ?? 0,
            input.isDropset ?? 0,
            input.notes ?? null,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update plan set:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update plan set"
        });
      }
    }),

  deletePlanSet: cairnProcedure
    .input(planSetIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT workoutPlans.userId FROM workoutPlans INNER JOIN planExercises ON planExercises.planId = workoutPlans.id INNER JOIN planSets ON planSets.planExerciseId = planExercises.id WHERE planSets.id = ?",
          args: [input.id]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: "DELETE FROM planSets WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete plan set:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete plan set"
        });
      }
    }),

  createRoutePoint: cairnProcedure
    .input(routePointSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT userId FROM workoutPlans WHERE id = ?",
          args: [input.planId]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: `INSERT INTO routePoints (id, planId, latitude, longitude, orderIndex, isWaypoint)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.planId,
            input.latitude,
            input.longitude,
            input.orderIndex,
            input.isWaypoint ?? 0
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create route point:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create route point"
        });
      }
    }),

  updateRoutePoint: cairnProcedure
    .input(routePointSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT workoutPlans.userId FROM workoutPlans INNER JOIN routePoints ON routePoints.planId = workoutPlans.id WHERE routePoints.id = ?",
          args: [input.id]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: `UPDATE routePoints SET latitude = ?, longitude = ?, orderIndex = ?, isWaypoint = ? WHERE id = ?`,
          args: [
            input.latitude,
            input.longitude,
            input.orderIndex,
            input.isWaypoint ?? 0,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update route point:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update route point"
        });
      }
    }),

  deleteRoutePoint: cairnProcedure
    .input(routePointIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const planCheck = await conn.execute({
          sql: "SELECT workoutPlans.userId FROM workoutPlans INNER JOIN routePoints ON routePoints.planId = workoutPlans.id WHERE routePoints.id = ?",
          args: [input.id]
        });
        if (
          !planCheck.rows.length ||
          planCheck.rows[0].userId !== ctx.cairnUserId
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: "DELETE FROM routePoints WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete route point:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete route point"
        });
      }
    }),

  createWorkout: cairnProcedure
    .input(workoutSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.userId != ctx.cairnUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
      }
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO workouts (id, userId, planId, type, name, startDate, endDate, durationSeconds, distanceMeters, calories, averageHeartRate, maxHeartRate, averagePace, elevationGain, status, source, healthKitUUID, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.userId,
            input.planId ?? null,
            input.type,
            input.name ?? null,
            input.startDate,
            input.endDate ?? null,
            input.durationSeconds ?? null,
            input.distanceMeters ?? null,
            input.calories ?? null,
            input.averageHeartRate ?? null,
            input.maxHeartRate ?? null,
            input.averagePace ?? null,
            input.elevationGain ?? null,
            input.status,
            input.source,
            input.healthKitUUID ?? null,
            input.notes ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create workout:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workout"
        });
      }
    }),

  updateWorkout: cairnProcedure
    .input(workoutSchema)
    .mutation(async ({ input, ctx }) => {
      if (input.userId != ctx.cairnUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
      }
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE workouts SET planId = ?, type = ?, name = ?, startDate = ?, endDate = ?, durationSeconds = ?, distanceMeters = ?, calories = ?, averageHeartRate = ?, maxHeartRate = ?, averagePace = ?, elevationGain = ?, status = ?, source = ?, healthKitUUID = ?, notes = ?, updatedAt = datetime('now') WHERE id = ?`,
          args: [
            input.planId ?? null,
            input.type,
            input.name ?? null,
            input.startDate,
            input.endDate ?? null,
            input.durationSeconds ?? null,
            input.distanceMeters ?? null,
            input.calories ?? null,
            input.averageHeartRate ?? null,
            input.maxHeartRate ?? null,
            input.averagePace ?? null,
            input.elevationGain ?? null,
            input.status,
            input.source,
            input.healthKitUUID ?? null,
            input.notes ?? null,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update workout:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workout"
        });
      }
    }),

  deleteWorkout: cairnProcedure
    .input(workoutIdSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();
        const check = await conn.execute({
          sql: "SELECT userId FROM workouts WHERE id = ?",
          args: [input.id]
        });
        if (!check.rows.length || check.rows[0].userId !== ctx.cairnUserId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User mismatch" });
        }
        await conn.execute({
          sql: "DELETE FROM workouts WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete workout:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workout"
        });
      }
    }),

  createHeartRateSample: cairnProcedure
    .input(heartRateSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO heartRateSamples (id, workoutId, timestamp, bpm, source)
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.workoutId,
            input.timestamp,
            input.bpm,
            input.source ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create heart rate sample:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create heart rate sample"
        });
      }
    }),

  updateHeartRateSample: cairnProcedure
    .input(heartRateSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE heartRateSamples SET timestamp = ?, bpm = ?, source = ? WHERE id = ?`,
          args: [input.timestamp, input.bpm, input.source ?? null, input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update heart rate sample:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update heart rate sample"
        });
      }
    }),

  deleteHeartRateSample: cairnProcedure
    .input(heartRateSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: "DELETE FROM heartRateSamples WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete heart rate sample:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete heart rate sample"
        });
      }
    }),

  createLocationSample: cairnProcedure
    .input(locationSampleSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO locationSamples (id, workoutId, timestamp, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, speed, course)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.workoutId,
            input.timestamp,
            input.latitude,
            input.longitude,
            input.altitude ?? null,
            input.horizontalAccuracy ?? null,
            input.verticalAccuracy ?? null,
            input.speed ?? null,
            input.course ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create location sample:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create location sample"
        });
      }
    }),

  updateLocationSample: cairnProcedure
    .input(locationSampleSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE locationSamples SET timestamp = ?, latitude = ?, longitude = ?, altitude = ?, horizontalAccuracy = ?, verticalAccuracy = ?, speed = ?, course = ? WHERE id = ?`,
          args: [
            input.timestamp,
            input.latitude,
            input.longitude,
            input.altitude ?? null,
            input.horizontalAccuracy ?? null,
            input.verticalAccuracy ?? null,
            input.speed ?? null,
            input.course ?? null,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update location sample:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update location sample"
        });
      }
    }),

  deleteLocationSample: cairnProcedure
    .input(locationSampleSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: "DELETE FROM locationSamples WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete location sample:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete location sample"
        });
      }
    }),

  createWorkoutSplit: cairnProcedure
    .input(workoutSplitSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO workoutSplits (id, workoutId, splitNumber, distanceMeters, durationSeconds, startTimestamp, endTimestamp, averageHeartRate, averagePace, elevationGain, elevationLoss)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.workoutId,
            input.splitNumber,
            input.distanceMeters,
            input.durationSeconds,
            input.startTimestamp,
            input.endTimestamp,
            input.averageHeartRate ?? null,
            input.averagePace ?? null,
            input.elevationGain ?? null,
            input.elevationLoss ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create workout split:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workout split"
        });
      }
    }),

  updateWorkoutSplit: cairnProcedure
    .input(workoutSplitSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE workoutSplits SET splitNumber = ?, distanceMeters = ?, durationSeconds = ?, startTimestamp = ?, endTimestamp = ?, averageHeartRate = ?, averagePace = ?, elevationGain = ?, elevationLoss = ? WHERE id = ?`,
          args: [
            input.splitNumber,
            input.distanceMeters,
            input.durationSeconds,
            input.startTimestamp,
            input.endTimestamp,
            input.averageHeartRate ?? null,
            input.averagePace ?? null,
            input.elevationGain ?? null,
            input.elevationLoss ?? null,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update workout split:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update workout split"
        });
      }
    }),

  deleteWorkoutSplit: cairnProcedure
    .input(workoutSplitSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: "DELETE FROM workoutSplits WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete workout split:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete workout split"
        });
      }
    }),

  createExerciseLibrary: cairnProcedure
    .input(exerciseLibrarySchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO exerciseLibrary (id, name, category, muscleGroups, equipment, instructions, defaultSets, defaultReps, defaultRestSeconds, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.name,
            input.category,
            input.muscleGroups ?? null,
            input.equipment ?? null,
            input.instructions ?? null,
            input.defaultSets ?? null,
            input.defaultReps ?? null,
            input.defaultRestSeconds ?? null,
            input.notes ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create exercise library:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create exercise library"
        });
      }
    }),

  updateExerciseLibrary: cairnProcedure
    .input(exerciseLibrarySchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE exerciseLibrary SET name = ?, category = ?, muscleGroups = ?, equipment = ?, instructions = ?, defaultSets = ?, defaultReps = ?, defaultRestSeconds = ?, notes = ?, updatedAt = datetime('now') WHERE id = ?`,
          args: [
            input.name,
            input.category,
            input.muscleGroups ?? null,
            input.equipment ?? null,
            input.instructions ?? null,
            input.defaultSets ?? null,
            input.defaultReps ?? null,
            input.defaultRestSeconds ?? null,
            input.notes ?? null,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update exercise library:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update exercise library"
        });
      }
    }),

  deleteExerciseLibrary: cairnProcedure
    .input(exerciseIdSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: "DELETE FROM exerciseLibrary WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete exercise library:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete exercise library"
        });
      }
    }),

  createAuthProvider: cairnProcedure
    .input(providerSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO authProviders (id, userId, provider, providerUserId, email, displayName, avatarUrl)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            input.id,
            input.userId,
            input.provider,
            input.providerUserId ?? null,
            input.email ?? null,
            input.displayName ?? null,
            input.avatarUrl ?? null
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to create auth provider:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create auth provider"
        });
      }
    }),

  updateAuthProvider: cairnProcedure
    .input(providerSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `UPDATE authProviders SET provider = ?, providerUserId = ?, email = ?, displayName = ?, avatarUrl = ?, lastUsedAt = datetime('now') WHERE id = ?`,
          args: [
            input.provider,
            input.providerUserId ?? null,
            input.email ?? null,
            input.displayName ?? null,
            input.avatarUrl ?? null,
            input.id
          ]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to update auth provider:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update auth provider"
        });
      }
    }),

  deleteAuthProvider: cairnProcedure
    .input(providerSchema.pick({ id: true }))
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: "DELETE FROM authProviders WHERE id = ?",
          args: [input.id]
        });
        return { success: true };
      } catch (error) {
        console.error("Failed to delete auth provider:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete auth provider"
        });
      }
    }),

  bulkUpsert: cairnProcedure
    .input(bulkSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = CairnConnectionFactory();

        if (input.users?.length) {
          for (const user of input.users) {
            if (user.id !== ctx.cairnUserId) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO users (id, email, emailVerified, firstName, lastName, displayName, avatarUrl, provider, appleUserId, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET email = excluded.email, emailVerified = excluded.emailVerified, firstName = excluded.firstName, lastName = excluded.lastName, displayName = excluded.displayName, avatarUrl = excluded.avatarUrl, provider = excluded.provider, appleUserId = excluded.appleUserId, status = excluded.status, updatedAt = datetime('now')`,
              args: [
                user.id,
                user.email ?? null,
                user.emailVerified ?? 0,
                user.firstName ?? null,
                user.lastName ?? null,
                user.displayName ?? null,
                user.avatarUrl ?? null,
                user.provider ?? null,
                user.appleUserId ?? null,
                user.status ?? "active"
              ]
            });
          }
        }

        if (input.exerciseLibrary?.length) {
          for (const exercise of input.exerciseLibrary) {
            await conn.execute({
              sql: `INSERT INTO exerciseLibrary (id, name, category, muscleGroups, equipment, instructions, defaultSets, defaultReps, defaultRestSeconds, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET name = excluded.name, category = excluded.category, muscleGroups = excluded.muscleGroups, equipment = excluded.equipment, instructions = excluded.instructions, defaultSets = excluded.defaultSets, defaultReps = excluded.defaultReps, defaultRestSeconds = excluded.defaultRestSeconds, notes = excluded.notes, updatedAt = datetime('now')`,
              args: [
                exercise.id,
                exercise.name,
                exercise.category,
                exercise.muscleGroups ?? null,
                exercise.equipment ?? null,
                exercise.instructions ?? null,
                exercise.defaultSets ?? null,
                exercise.defaultReps ?? null,
                exercise.defaultRestSeconds ?? null,
                exercise.notes ?? null
              ]
            });
          }
        }

        if (input.workoutPlans?.length) {
          for (const plan of input.workoutPlans) {
            if (plan.userId !== ctx.cairnUserId) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO workoutPlans (id, userId, name, description, category, difficulty, durationMinutes, type, isPublic)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, category = excluded.category, difficulty = excluded.difficulty, durationMinutes = excluded.durationMinutes, type = excluded.type, isPublic = excluded.isPublic, updatedAt = datetime('now')`,
              args: [
                plan.id,
                plan.userId,
                plan.name,
                plan.description ?? null,
                plan.category,
                plan.difficulty ?? "intermediate",
                plan.durationMinutes ?? null,
                plan.type,
                plan.isPublic ?? 0
              ]
            });
          }
        }

        if (input.planExercises?.length) {
          for (const planExercise of input.planExercises) {
            const planCheck = await conn.execute({
              sql: "SELECT userId FROM workoutPlans WHERE id = ?",
              args: [planExercise.planId]
            });
            if (
              !planCheck.rows.length ||
              planCheck.rows[0].userId !== ctx.cairnUserId
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO planExercises (id, planId, exerciseId, name, category, orderIndex, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET exerciseId = excluded.exerciseId, name = excluded.name, category = excluded.category, orderIndex = excluded.orderIndex, notes = excluded.notes`,
              args: [
                planExercise.id,
                planExercise.planId,
                planExercise.exerciseId ?? null,
                planExercise.name,
                planExercise.category,
                planExercise.orderIndex,
                planExercise.notes ?? null
              ]
            });
          }
        }

        if (input.planSets?.length) {
          for (const planSet of input.planSets) {
            const planExerciseCheck = await conn.execute({
              sql: "SELECT planId FROM planExercises WHERE id = ?",
              args: [planSet.planExerciseId]
            });
            if (planExerciseCheck.rows.length) {
              const planCheck = await conn.execute({
                sql: "SELECT userId FROM workoutPlans WHERE id = ?",
                args: [planExerciseCheck.rows[0].planId]
              });
              if (
                !planCheck.rows.length ||
                planCheck.rows[0].userId !== ctx.cairnUserId
              ) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message: "User mismatch"
                });
              }
            }
            await conn.execute({
              sql: `INSERT INTO planSets (id, planExerciseId, setNumber, reps, weight, durationSeconds, rpe, restAfterSeconds, isWarmup, isDropset, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET setNumber = excluded.setNumber, reps = excluded.reps, weight = excluded.weight, durationSeconds = excluded.durationSeconds, rpe = excluded.rpe, restAfterSeconds = excluded.restAfterSeconds, isWarmup = excluded.isWarmup, isDropset = excluded.isDropset, notes = excluded.notes`,
              args: [
                planSet.id,
                planSet.planExerciseId,
                planSet.setNumber,
                planSet.reps ?? null,
                planSet.weight ?? null,
                planSet.durationSeconds ?? null,
                planSet.rpe ?? null,
                planSet.restAfterSeconds ?? null,
                planSet.isWarmup ?? 0,
                planSet.isDropset ?? 0,
                planSet.notes ?? null
              ]
            });
          }
        }

        if (input.routePoints?.length) {
          for (const point of input.routePoints) {
            const planCheck = await conn.execute({
              sql: "SELECT userId FROM workoutPlans WHERE id = ?",
              args: [point.planId]
            });
            if (
              !planCheck.rows.length ||
              planCheck.rows[0].userId !== ctx.cairnUserId
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO routePoints (id, planId, latitude, longitude, orderIndex, isWaypoint)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude, orderIndex = excluded.orderIndex, isWaypoint = excluded.isWaypoint`,
              args: [
                point.id,
                point.planId,
                point.latitude,
                point.longitude,
                point.orderIndex,
                point.isWaypoint ?? 0
              ]
            });
          }
        }

        if (input.workouts?.length) {
          for (const workout of input.workouts) {
            if (workout.userId !== ctx.cairnUserId) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO workouts (id, userId, planId, type, name, startDate, endDate, durationSeconds, distanceMeters, calories, averageHeartRate, maxHeartRate, averagePace, elevationGain, status, source, healthKitUUID, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET planId = excluded.planId, type = excluded.type, name = excluded.name, startDate = excluded.startDate, endDate = excluded.endDate, durationSeconds = excluded.durationSeconds, distanceMeters = excluded.distanceMeters, calories = excluded.calories, averageHeartRate = excluded.averageHeartRate, maxHeartRate = excluded.maxHeartRate, averagePace = excluded.averagePace, elevationGain = excluded.elevationGain, status = excluded.status, source = excluded.source, healthKitUUID = excluded.healthKitUUID, notes = excluded.notes, updatedAt = datetime('now')`,
              args: [
                workout.id,
                workout.userId,
                workout.planId ?? null,
                workout.type,
                workout.name ?? null,
                workout.startDate,
                workout.endDate ?? null,
                workout.durationSeconds ?? null,
                workout.distanceMeters ?? null,
                workout.calories ?? null,
                workout.averageHeartRate ?? null,
                workout.maxHeartRate ?? null,
                workout.averagePace ?? null,
                workout.elevationGain ?? null,
                workout.status,
                workout.source,
                workout.healthKitUUID ?? null,
                workout.notes ?? null
              ]
            });
          }
        }

        if (input.heartRateSamples?.length) {
          for (const sample of input.heartRateSamples) {
            const workoutCheck = await conn.execute({
              sql: "SELECT userId FROM workouts WHERE id = ?",
              args: [sample.workoutId]
            });
            if (
              !workoutCheck.rows.length ||
              workoutCheck.rows[0].userId !== ctx.cairnUserId
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO heartRateSamples (id, workoutId, timestamp, bpm, source)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET timestamp = excluded.timestamp, bpm = excluded.bpm, source = excluded.source`,
              args: [
                sample.id,
                sample.workoutId,
                sample.timestamp,
                sample.bpm,
                sample.source ?? null
              ]
            });
          }
        }

        if (input.locationSamples?.length) {
          for (const sample of input.locationSamples) {
            const workoutCheck = await conn.execute({
              sql: "SELECT userId FROM workouts WHERE id = ?",
              args: [sample.workoutId]
            });
            if (
              !workoutCheck.rows.length ||
              workoutCheck.rows[0].userId !== ctx.cairnUserId
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO locationSamples (id, workoutId, timestamp, latitude, longitude, altitude, horizontalAccuracy, verticalAccuracy, speed, course)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET timestamp = excluded.timestamp, latitude = excluded.latitude, longitude = excluded.longitude, altitude = excluded.altitude, horizontalAccuracy = excluded.horizontalAccuracy, verticalAccuracy = excluded.verticalAccuracy, speed = excluded.speed, course = excluded.course`,
              args: [
                sample.id,
                sample.workoutId,
                sample.timestamp,
                sample.latitude,
                sample.longitude,
                sample.altitude ?? null,
                sample.horizontalAccuracy ?? null,
                sample.verticalAccuracy ?? null,
                sample.speed ?? null,
                sample.course ?? null
              ]
            });
          }
        }

        if (input.workoutSplits?.length) {
          for (const split of input.workoutSplits) {
            const workoutCheck = await conn.execute({
              sql: "SELECT userId FROM workouts WHERE id = ?",
              args: [split.workoutId]
            });
            if (
              !workoutCheck.rows.length ||
              workoutCheck.rows[0].userId !== ctx.cairnUserId
            ) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO workoutSplits (id, workoutId, splitNumber, distanceMeters, durationSeconds, startTimestamp, endTimestamp, averageHeartRate, averagePace, elevationGain, elevationLoss)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET splitNumber = excluded.splitNumber, distanceMeters = excluded.distanceMeters, durationSeconds = excluded.durationSeconds, startTimestamp = excluded.startTimestamp, endTimestamp = excluded.endTimestamp, averageHeartRate = excluded.averageHeartRate, averagePace = excluded.averagePace, elevationGain = excluded.elevationGain, elevationLoss = excluded.elevationLoss`,
              args: [
                split.id,
                split.workoutId,
                split.splitNumber,
                split.distanceMeters,
                split.durationSeconds,
                split.startTimestamp,
                split.endTimestamp,
                split.averageHeartRate ?? null,
                split.averagePace ?? null,
                split.elevationGain ?? null,
                split.elevationLoss ?? null
              ]
            });
          }
        }

        if (input.authProviders?.length) {
          for (const provider of input.authProviders) {
            if (provider.userId !== ctx.cairnUserId) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "User mismatch"
              });
            }
            await conn.execute({
              sql: `INSERT INTO authProviders (id, userId, provider, providerUserId, email, displayName, avatarUrl)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET provider = excluded.provider, providerUserId = excluded.providerUserId, email = excluded.email, displayName = excluded.displayName, avatarUrl = excluded.avatarUrl, lastUsedAt = datetime('now')`,
              args: [
                provider.id,
                provider.userId,
                provider.provider,
                provider.providerUserId ?? null,
                provider.email ?? null,
                provider.displayName ?? null,
                provider.avatarUrl ?? null
              ]
            });
          }
        }

        return { success: true };
      } catch (error) {
        console.error("Failed bulk upsert:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to bulk upsert"
        });
      }
    })
});
