import { createTRPCRouter, cairnProcedure } from "../utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { CairnConnectionFactory } from "~/server/database";
import { cache } from "~/server/cache";

const CAIRN_CACHE_TTL_MS = 5 * 60 * 1000;

const paginatedQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
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

export const remoteDbRouter = createTRPCRouter({
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

  getUsers: cairnProcedure
    .input(paginatedQuerySchema)
    .query(async ({ input }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-users:${limit}:${offset}`;

      const cached = await cache.get<{
        users: Array<{ id: string; email: string | null }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const result = await conn.execute({
          sql: "SELECT id, email FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?",
          args: [limit, offset]
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
    .query(async ({ input }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-plans:${limit}:${offset}`;

      const cached = await cache.get<{
        plans: Array<{ id: string; name: string; category: string }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const result = await conn.execute({
          sql: "SELECT id, name, category FROM workoutPlans ORDER BY createdAt DESC LIMIT ? OFFSET ?",
          args: [limit, offset]
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

  getWorkouts: cairnProcedure
    .input(paginatedQuerySchema)
    .query(async ({ input }) => {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const cacheKey = `cairn-workouts:${limit}:${offset}`;

      const cached = await cache.get<{
        workouts: Array<{ id: string; type: string; startDate: string }>;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const conn = CairnConnectionFactory();
        const result = await conn.execute({
          sql: "SELECT id, type, startDate FROM workouts ORDER BY startDate DESC LIMIT ? OFFSET ?",
          args: [limit, offset]
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

  createUser: cairnProcedure
    .input(userInputSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
        await conn.execute({
          sql: `INSERT INTO users (id, email, emailVerified, firstName, lastName, displayName, avatarUrl, provider, appleUserId, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();
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
          args: [
            input.timestamp,
            input.bpm,
            input.source ?? null,
            input.id
          ]
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
    .mutation(async ({ input }) => {
      try {
        const conn = CairnConnectionFactory();

        if (input.users?.length) {
          for (const user of input.users) {
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
