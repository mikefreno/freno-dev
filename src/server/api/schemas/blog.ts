import { z } from "zod";

/**
 * Blog/Post API Validation Schemas
 *
 * Schemas for post creation, updating, querying, and interactions
 */

// ============================================================================
// Post Creation and Updates
// ============================================================================

/**
 * Create new post schema
 */
export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be under 200 characters"),
  subtitle: z
    .string()
    .max(300, "Subtitle must be under 300 characters")
    .optional(),
  body: z.string().min(1, "Post body is required"),
  banner_photo: z.string().url("Must be a valid URL").optional(),
  published: z.boolean().default(false),
  category: postCategorySchema.default("blog"),
  attachments: z.string().optional()
});

/**
 * Update post schema (partial updates)
 */
export const updatePostSchema = z.object({
  postId: z.number(),
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(300).optional(),
  body: z.string().min(1).optional(),
  banner_photo: z.string().url().optional(),
  published: z.boolean().optional(),
  attachments: z.string().optional()
});

/**
 * Delete post schema
 */
export const deletePostSchema = z.object({
  postId: z.number()
});

// ============================================================================
// Post Queries and Filtering
// ============================================================================

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
 * Get single post by ID or slug
 */
export const getPostSchema = z
  .object({
    postId: z.number().optional(),
    slug: z.string().optional()
  })
  .refine((data) => data.postId || data.slug, {
    message: "Either postId or slug must be provided"
  });

// ============================================================================
// Post Interactions
// ============================================================================

/**
 * Increment post read count
 */
export const incrementPostReadSchema = z.object({
  postId: z.number()
});

/**
 * Like/unlike post
 */
export const togglePostLikeSchema = z.object({
  postId: z.number()
});

// ============================================================================
// Tag Management
// ============================================================================

/**
 * Add tags to post
 */
export const addTagsToPostSchema = z.object({
  postId: z.number(),
  tags: z
    .array(z.string().min(1).max(50))
    .min(1, "At least one tag is required")
});

/**
 * Remove tag from post
 */
export const removeTagFromPostSchema = z.object({
  tagId: z.number()
});

/**
 * Update post tags (replaces all tags)
 */
export const updatePostTagsSchema = z.object({
  postId: z.number(),
  tags: z.array(z.string().min(1).max(50))
});

// ============================================================================
// Type Exports
// ============================================================================

export type PostCategory = z.infer<typeof postCategorySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type PostSortMode = z.infer<typeof postSortModeSchema>;
export type PostQueryInput = z.infer<typeof postQueryInputSchema>;
export type GetPostInput = z.infer<typeof getPostSchema>;
export type IncrementPostReadInput = z.infer<typeof incrementPostReadSchema>;
export type TogglePostLikeInput = z.infer<typeof togglePostLikeSchema>;
export type AddTagsToPostInput = z.infer<typeof addTagsToPostSchema>;
export type RemoveTagFromPostInput = z.infer<typeof removeTagFromPostSchema>;
export type UpdatePostTagsInput = z.infer<typeof updatePostTagsSchema>;
