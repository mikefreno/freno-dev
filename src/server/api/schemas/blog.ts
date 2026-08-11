import { z } from "zod";

/**
 * Blog/Post API Validation Schemas
 *
 * Schemas for post creation, updating, querying, and interactions
 */

// ============================================================================
// Post Interactions
// ============================================================================

/**
 * Increment post read count
 */
export const incrementPostReadSchema = z.object({
  postId: z.number()
});

// ============================================================================
// Type Exports
// ============================================================================

export type IncrementPostReadInput = z.infer<typeof incrementPostReadSchema>;
