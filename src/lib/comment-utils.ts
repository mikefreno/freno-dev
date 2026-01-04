import type { Comment, CommentReaction, SortingMode } from "~/types/comment";
import { getSQLFormattedDate } from "./date-utils";

export { getSQLFormattedDate };

export function getChildComments(
  parentCommentID: number,
  allComments: Comment[] | undefined
): Comment[] | undefined {
  if (!allComments) return undefined;

  return allComments.filter(
    (comment) => comment.parent_comment_id === parentCommentID
  );
}

export function getTotalCommentCount(
  topLevelComments: Comment[],
  allComments: Comment[]
): number {
  return allComments.length;
}

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

/**
 * @deprecated Server-side SQL sorting preferred for performance
 * Logarithmic decay formula: score / log(age + 2)
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

  return score / Math.log10(ageInHours + 2);
}

/**
 * @deprecated Server-side SQL sorting preferred for performance
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
 * @deprecated Server-side SQL sorting preferred for performance
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
 * @deprecated Use server-side SQL sorting in routes/blog/[title]/index.tsx for better performance
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

export function isValidCommentBody(body: string): boolean {
  return body.trim().length > 0 && body.length <= 10000;
}

export function canModifyComment(
  userID: string,
  commenterID: string,
  privilegeLevel: "admin" | "user" | "anonymous"
): boolean {
  if (privilegeLevel === "admin") return true;
  if (privilegeLevel === "anonymous") return false;
  return userID === commenterID;
}

export function canDatabaseDelete(
  privilegeLevel: "admin" | "user" | "anonymous"
): boolean {
  return privilegeLevel === "admin";
}
