/**
 * Comment API Validation Schemas
 *
 * Zod schemas for comment-related tRPC procedures:
 * - Comment creation, updating, deletion
 * - Comment reactions
 * - Comment sorting and filtering
 */

import { z } from "zod";

// ============================================================================
// Comment CRUD Operations
// ============================================================================

/**
 * Create new comment schema
 */
export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment too long"),
  post_id: z.number(),
  parent_comment_id: z.number().optional()
});

/**
 * Update comment schema
 */
export const updateCommentSchema = z.object({
  commentId: z.number(),
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment too long")
});

/**
 * Delete comment schema
 */
export const deleteCommentSchema = z.object({
  commentId: z.number(),
  deletionType: z.enum(["user", "admin", "database"]).optional()
});

/**
 * Get comments for post schema
 */
export const getCommentsSchema = z.object({
  postId: z.number(),
  sortBy: z.enum(["newest", "oldest", "highest_rated", "hot"]).default("newest")
});

// ============================================================================
// Comment Reactions
// ============================================================================

/**
 * Valid reaction types
 */
export const reactionTypeSchema = z.enum([
  "tears",
  "blank",
  "tongue",
  "cry",
  "heartEye",
  "angry",
  "moneyEye",
  "sick",
  "upsideDown",
  "worried"
]);

/**
 * Add/remove reaction to comment
 */
export const toggleCommentReactionSchema = z.object({
  commentId: z.number(),
  reactionType: reactionTypeSchema
});

/**
 * Get reactions for comment
 */
export const getCommentReactionsSchema = z.object({
  commentId: z.number()
});

// ============================================================================
// Comment Sorting
// ============================================================================

/**
 * Valid comment sorting modes
 */
export const commentSortSchema = z
  .enum(["newest", "oldest", "highest_rated", "hot"])
  .default("newest");

// ============================================================================
// Type Exports
// ============================================================================

export type CommentSortMode = z.infer<typeof commentSortSchema>;
export type ReactionType = z.infer<typeof reactionTypeSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
export type ToggleCommentReactionInput = z.infer<
  typeof toggleCommentReactionSchema
>;
export type GetCommentReactionsInput = z.infer<
  typeof getCommentReactionsSchema
>;
