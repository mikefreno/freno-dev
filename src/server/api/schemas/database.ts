import { z } from "zod";

/**
 * Database Entity Validation Schemas
 *
 * Zod schemas that mirror the TypeScript interfaces in ~/db/types.ts
 * Use these schemas for validating database inputs and outputs in tRPC procedures
 */

// ============================================================================
// User Schemas
// ============================================================================

/**
 * Full User schema matching database structure
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable().optional(),
  email_verified: z.number(),
  password_hash: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  provider: z.enum(["email", "google", "github"]).nullable().optional(),
  image: z.string().url().nullable().optional(),
  apple_user_string: z.string().nullable().optional(),
  database_name: z.string().nullable().optional(),
  database_token: z.string().nullable().optional(),
  database_url: z.string().nullable().optional(),
  db_destroy_date: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string()
});

/**
 * User creation input (for registration)
 */
export const createUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  display_name: z.string().min(1).max(50).optional(),
  provider: z.enum(["email", "google", "github"]).optional(),
  image: z.string().url().optional()
});

/**
 * User update input (partial updates)
 */
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  display_name: z.string().min(1).max(50).optional(),
  image: z.string().url().optional()
});

// ============================================================================
// Post Schemas
// ============================================================================

/**
 * Full Post schema matching database structure
 */
export const postSchema = z.object({
  id: z.number(),
  category: z.enum(["blog", "project"]),
  title: z.string(),
  subtitle: z.string().optional(),
  body: z.string(),
  banner_photo: z.string().optional(),
  date: z.string(),
  published: z.boolean(),
  author_id: z.string(),
  reads: z.number(),
  attachments: z.string().optional()
});

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

/**
 * Post with aggregated data
 */
export const postWithCommentsAndLikesSchema = postSchema.extend({
  total_likes: z.number(),
  total_comments: z.number()
});

// ============================================================================
// Comment Schemas
// ============================================================================

/**
 * Full Comment schema matching database structure
 */
export const commentSchema = z.object({
  id: z.number(),
  body: z.string(),
  post_id: z.number(),
  parent_comment_id: z.number().optional(),
  date: z.string(),
  edited: z.boolean(),
  commenter_id: z.string()
});

/**
 * Comment creation input
 */
export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  post_id: z.number(),
  parent_comment_id: z.number().optional()
});

/**
 * Comment update input
 */
export const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000)
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
  "worried"
]);

/**
 * Full CommentReaction schema matching database structure
 */
export const commentReactionSchema = z.object({
  id: z.number(),
  type: reactionTypeSchema,
  comment_id: z.number(),
  user_id: z.string()
});

/**
 * Comment reaction creation input
 */
export const createCommentReactionSchema = z.object({
  type: reactionTypeSchema,
  comment_id: z.number()
});

// ============================================================================
// PostLike Schemas
// ============================================================================

/**
 * Full PostLike schema matching database structure
 */
export const postLikeSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  post_id: z.number()
});

/**
 * PostLike creation input
 */
export const createPostLikeSchema = z.object({
  post_id: z.number()
});

// ============================================================================
// Tag Schemas
// ============================================================================

/**
 * Full Tag schema matching database structure
 */
export const tagSchema = z.object({
  id: z.number(),
  value: z.string(),
  post_id: z.number()
});

/**
 * Tag creation input
 */
export const createTagSchema = z.object({
  value: z.string().min(1).max(50),
  post_id: z.number()
});

/**
 * PostWithTags schema
 */
export const postWithTagsSchema = postSchema.extend({
  tags: z.array(tagSchema)
});

// ============================================================================
// Connection Schemas
// ============================================================================

/**
 * Full Connection schema matching database structure
 */
export const connectionSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  connection_id: z.string(),
  post_id: z.number().optional()
});

/**
 * Connection creation input
 */
export const createConnectionSchema = z.object({
  connection_id: z.string(),
  post_id: z.number().optional()
});

// ============================================================================
// Common Query Schemas
// ============================================================================

/**
 * ID-based query schemas
 */
export const idSchema = z.object({
  id: z.number()
});

export const userIdSchema = z.object({
  userId: z.string()
});

export const postIdSchema = z.object({
  postId: z.number()
});

export const commentIdSchema = z.object({
  commentId: z.number()
});

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
});

// ============================================================================
// Type Exports
// ============================================================================

export type ReactionType = z.infer<typeof reactionTypeSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateCommentReactionInput = z.infer<
  typeof createCommentReactionSchema
>;
export type CreatePostLikeInput = z.infer<typeof createPostLikeSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type CreateConnectionInput = z.infer<typeof createConnectionSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
