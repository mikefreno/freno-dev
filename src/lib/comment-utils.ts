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
