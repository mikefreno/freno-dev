/**
 * Comment System Utility Functions
 *
 * Shared utility functions for:
 * - Date formatting
 * - Comment sorting algorithms
 * - Comment filtering and tree building
 * - Debouncing
 */

import type { Comment, CommentReaction, SortingMode } from "~/types/comment";

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Formats current date to match SQL datetime format
 * Note: Adds 4 hours to match server timezone (EST)
 * Returns format: YYYY-MM-DD HH:MM:SS
 */
export function getSQLFormattedDate(): string {
  const date = new Date();
  date.setHours(date.getHours() + 4);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// Comment Tree Utilities
// ============================================================================

/**
 * Gets all child comments for a given parent comment ID
 */
export function getChildComments(
  parentCommentID: number,
  allComments: Comment[] | undefined
): Comment[] | undefined {
  if (!allComments) return undefined;

  return allComments.filter(
    (comment) => comment.parent_comment_id === parentCommentID
  );
}

/**
 * Counts the total number of comments including all nested children
 */
export function getTotalCommentCount(
  topLevelComments: Comment[],
  allComments: Comment[]
): number {
  return allComments.length;
}

/**
 * Gets the nesting level of a comment in the tree
 * Top-level comments (parent_comment_id = -1 or null) are level 0
 */
export function getCommentLevel(
  comment: Comment,
  allComments: Comment[]
): number {
  let level = 0;
  let currentComment = comment;

  while (
    currentComment.parent_comment_id &&
    currentComment.parent_comment_id !== -1
  ) {
    level++;
    const parent = allComments.find(
      (c) => c.id === currentComment.parent_comment_id
    );
    if (!parent) break;
    currentComment = parent;
  }

  return level;
}

// ============================================================================
// Comment Sorting Algorithms
// ============================================================================

/**
 * Calculates "hot" score for a comment based on votes and time
 * Uses logarithmic decay for older comments
 */
function calculateHotScore(
  upvotes: number,
  downvotes: number,
  date: string
): number {
  const score = upvotes - downvotes;
  const now = new Date().getTime();
  const commentTime = new Date(date).getTime();
  const ageInHours = (now - commentTime) / (1000 * 60 * 60);

  // Logarithmic decay: score / log(age + 2)
  // Adding 2 prevents division by zero for very new comments
  return score / Math.log10(ageInHours + 2);
}

/**
 * Counts upvotes for a comment from reaction map
 */
function getUpvoteCount(
  commentID: number,
  reactionMap: Map<number, CommentReaction[]>
): number {
  const reactions = reactionMap.get(commentID) || [];
  return reactions.filter(
    (r) => r.type === "tears" || r.type === "heartEye" || r.type === "moneyEye"
  ).length;
}

/**
 * Counts downvotes for a comment from reaction map
 */
function getDownvoteCount(
  commentID: number,
  reactionMap: Map<number, CommentReaction[]>
): number {
  const reactions = reactionMap.get(commentID) || [];
  return reactions.filter(
    (r) => r.type === "angry" || r.type === "sick" || r.type === "worried"
  ).length;
}

/**
 * Sorts comments based on the selected sorting mode
 *
 * Modes:
 * - newest: Most recent first
 * - oldest: Oldest first
 * - highest_rated: Most upvotes minus downvotes
 * - hot: Combines votes and recency (Reddit-style)
 */
export function sortComments(
  comments: Comment[],
  mode: SortingMode,
  reactionMap: Map<number, CommentReaction[]>
): Comment[] {
  const sorted = [...comments];

  switch (mode) {
    case "newest":
      return sorted.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

    case "oldest":
      return sorted.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

    case "highest_rated":
      return sorted.sort((a, b) => {
        const upVotesA = getUpvoteCount(a.id, reactionMap);
        const downVotesA = getDownvoteCount(a.id, reactionMap);
        const upVotesB = getUpvoteCount(b.id, reactionMap);
        const downVotesB = getDownvoteCount(b.id, reactionMap);

        const scoreA = upVotesA - downVotesA;
        const scoreB = upVotesB - downVotesB;

        return scoreB - scoreA;
      });

    case "hot":
      return sorted.sort((a, b) => {
        const upVotesA = getUpvoteCount(a.id, reactionMap);
        const downVotesA = getDownvoteCount(a.id, reactionMap);
        const upVotesB = getUpvoteCount(b.id, reactionMap);
        const downVotesB = getDownvoteCount(b.id, reactionMap);

        const hotScoreA = calculateHotScore(upVotesA, downVotesA, a.date);
        const hotScoreB = calculateHotScore(upVotesB, downVotesB, b.date);

        return hotScoreB - hotScoreA;
      });

    default:
      return sorted;
  }
}

// ============================================================================
// Debounce Utility
// ============================================================================

/**
 * Debounces a function call to limit execution frequency
 * Useful for window resize and scroll events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates that a comment body meets requirements
 */
export function isValidCommentBody(body: string): boolean {
  return body.trim().length > 0 && body.length <= 10000;
}

/**
 * Checks if a user can modify (edit/delete) a comment
 */
export function canModifyComment(
  userID: string,
  commenterID: string,
  privilegeLevel: "admin" | "user" | "anonymous"
): boolean {
  if (privilegeLevel === "admin") return true;
  if (privilegeLevel === "anonymous") return false;
  return userID === commenterID;
}

/**
 * Checks if a user can delete with database-level deletion
 */
export function canDatabaseDelete(
  privilegeLevel: "admin" | "user" | "anonymous"
): boolean {
  return privilegeLevel === "admin";
}
