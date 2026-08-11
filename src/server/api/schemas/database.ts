import { z } from "zod";

/**
 * Database Entity Validation Schemas
 *
 * Zod schemas that mirror the TypeScript interfaces in ~/db/types.ts
 * Use these schemas for validating database inputs and outputs in tRPC procedures
 */

// ============================================================================
// Post Schemas
// ============================================================================

/**
 * Post creation input
 */
export const createPostSchema = z.object({
  category: z.enum(["blog", "project"]).default("blog"),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  body: z.string().min(1),
  banner_photo: z.string().url().optional(),
  published: z.boolean().default(false),
  attachments: z.string().optional()
});

/**
 * Post update input (partial updates)
 */
export const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(300).optional(),
  body: z.string().min(1).optional(),
  banner_photo: z.string().url().optional(),
  published: z.boolean().optional(),
  attachments: z.string().optional()
});

// ============================================================================
// CommentReaction Schemas
// ============================================================================

/**
 * Reaction types for comments
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
  "worried",
  "upVote",
  "downVote"
]);

// ============================================================================
// Common Query Schemas
// ============================================================================

/**
 * ID-based query schemas
 */
export const idSchema = z.object({
  id: z.number()
});

// ============================================================================
// Additional Database Router Schemas
// ============================================================================

/**
 * Get post by ID or title
 */
export const getPostByIdSchema = z.object({
  category: z.literal("blog"),
  id: z.number()
});

export const getPostByTitleSchema = z.object({
  category: z.literal("blog"),
  title: z.string()
});

/**
 * Get comments by post ID
 */
export const getCommentsByPostIdSchema = z.object({
  post_id: z.number()
});

/**
 * Toggle post like (add/remove)
 */
export const togglePostLikeMutationSchema = z.object({
  user_id: z.string(),
  post_id: z.number()
});

/**
 * Toggle comment reaction (add/remove)
 */
export const toggleCommentReactionMutationSchema = z.object({
  type: reactionTypeSchema,
  comment_id: z.number(),
  user_id: z.string()
});

/**
 * Get comment reactions
 */
export const getCommentReactionsQuerySchema = z.object({
  commentID: z.number()
});

/**
 * Delete comment with deletion type
 */
export const deleteCommentWithTypeSchema = z.object({
  commentID: z.number(),
  commenterID: z.string(),
  deletionType: z.enum(["user", "admin", "database"])
});

/**
 * User query schemas
 */
export const getUserByIdSchema = z.object({
  id: z.string()
});

export const updateUserImageSchema = z.object({
  id: z.string(),
  imageURL: z.string()
});

export const updateUserEmailSchema = z.object({
  id: z.string(),
  newEmail: z.string().email(),
  oldEmail: z.string().email()
});

// ============================================================================
// Type Exports
// ============================================================================

export type ReactionType = z.infer<typeof reactionTypeSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type GetPostByIdInput = z.infer<typeof getPostByIdSchema>;
export type GetPostByTitleInput = z.infer<typeof getPostByTitleSchema>;
export type GetCommentsByPostIdInput = z.infer<
  typeof getCommentsByPostIdSchema
>;
export type TogglePostLikeMutationInput = z.infer<
  typeof togglePostLikeMutationSchema
>;
export type ToggleCommentReactionMutationInput = z.infer<
  typeof toggleCommentReactionMutationSchema
>;
export type GetCommentReactionsQueryInput = z.infer<
  typeof getCommentReactionsQuerySchema
>;
export type DeleteCommentWithTypeInput = z.infer<
  typeof deleteCommentWithTypeSchema
>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type UpdateUserImageInput = z.infer<typeof updateUserImageSchema>;
export type UpdateUserEmailInput = z.infer<typeof updateUserEmailSchema>;
