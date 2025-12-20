/**
 * Comment API Validation Schemas
 *
 * Zod schemas for comment-related tRPC procedures:
 * - Comment sorting validation
 */

import { z } from "zod";

// ============================================================================
// Comment Sorting
// ============================================================================

/**
 * Valid comment sorting modes
 */
export const commentSortSchema = z
  .enum(["newest", "oldest", "highest_rated", "hot"])
  .default("newest");

export type CommentSortMode = z.infer<typeof commentSortSchema>;
