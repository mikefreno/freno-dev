import { z } from "zod";

/**
 * Blog Query Schemas
 *
 * Schemas for filtering and sorting blog posts server-side
 */

/**
 * Post sort mode enum
 * Defines available sorting options for blog posts
 */
export const postSortModeSchema = z.enum([
  "newest",
  "oldest",
  "most_liked",
  "most_read",
  "most_comments"
]);

/**
 * Post query input schema
 * Accepts optional filters (pipe-separated tags) and sort mode
 */
export const postQueryInputSchema = z.object({
  /**
   * Pipe-separated list of tags to filter by
   * e.g., "tech|design|javascript"
   * Empty string or undefined means no filter
   */
  filters: z.string().optional(),

  /**
   * Sort mode for posts
   * Defaults to "newest" if not specified
   */
  sortBy: postSortModeSchema.default("newest")
});

/**
 * Type exports for use in components
 */
export type PostSortMode = z.infer<typeof postSortModeSchema>;
export type PostQueryInput = z.infer<typeof postQueryInputSchema>;
