import { createTRPCRouter, publicProcedure } from "../utils";
import { ConnectionFactory } from "~/server/utils";
import { z } from "zod";
import { getUserID } from "~/server/auth";
import { TRPCError } from "@trpc/server";
import diff from "fast-diff";

// Helper to create diff patch between two HTML strings
export function createDiffPatch(
  oldContent: string,
  newContent: string
): string {
  const changes = diff(oldContent, newContent);
  return JSON.stringify(changes);
}

// Helper to apply diff patch to content
export function applyDiffPatch(baseContent: string, patchJson: string): string {
  const changes = JSON.parse(patchJson);
  let result = "";
  let position = 0;

  for (const [operation, text] of changes) {
    if (operation === diff.EQUAL) {
      result += text;
      position += text.length;
    } else if (operation === diff.DELETE) {
      position += text.length;
    } else if (operation === diff.INSERT) {
      result += text;
    }
  }

  return result;
}

// Helper to reconstruct content from history chain
async function reconstructContent(
  conn: ReturnType<typeof ConnectionFactory>,
  historyId: number
): Promise<string> {
  // Get the full chain from root to this history entry
  const chain: Array<{
    id: number;
    parent_id: number | null;
    content: string;
  }> = [];

  let currentId: number | null = historyId;

  while (currentId !== null) {
    const result = await conn.execute({
      sql: "SELECT id, parent_id, content FROM PostHistory WHERE id = ?",
      args: [currentId]
    });

    if (result.rows.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "History entry not found"
      });
    }

    const row = result.rows[0] as {
      id: number;
      parent_id: number | null;
      content: string;
    };
    chain.unshift(row);
    currentId = row.parent_id;
  }

  // Apply patches in order
  let content = "";
  for (const entry of chain) {
    content = applyDiffPatch(content, entry.content);
  }

  return content;
}

export const postHistoryRouter = createTRPCRouter({
  // Save a new history entry
  save: publicProcedure
    .input(
      z.object({
        postId: z.number(),
        content: z.string(),
        previousContent: z.string(),
        parentHistoryId: z.number().nullable(),
        isSaved: z.boolean().default(false)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = await getUserID(ctx.event.nativeEvent);

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be authenticated to save history"
        });
      }

      const conn = ConnectionFactory();

      // Verify post exists and user is author
      const postCheck = await conn.execute({
        sql: "SELECT author_id FROM Post WHERE id = ?",
        args: [input.postId]
      });

      if (postCheck.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found"
        });
      }

      const post = postCheck.rows[0] as { author_id: string };
      if (post.author_id !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to modify this post"
        });
      }

      // Create diff patch
      const diffPatch = createDiffPatch(input.previousContent, input.content);

      // Insert history entry
      const result = await conn.execute({
        sql: `
          INSERT INTO PostHistory (post_id, parent_id, content, is_saved)
          VALUES (?, ?, ?, ?)
        `,
        args: [
          input.postId,
          input.parentHistoryId,
          diffPatch,
          input.isSaved ? 1 : 0
        ]
      });

      // Prune old history entries if we exceed 100
      const countResult = await conn.execute({
        sql: "SELECT COUNT(*) as count FROM PostHistory WHERE post_id = ?",
        args: [input.postId]
      });

      const count = (countResult.rows[0] as { count: number }).count;
      if (count > 100) {
        // Get the oldest entries to delete (keep most recent 100)
        const toDelete = await conn.execute({
          sql: `
            SELECT id FROM PostHistory 
            WHERE post_id = ? 
            ORDER BY created_at ASC 
            LIMIT ?
          `,
          args: [input.postId, count - 100]
        });

        // Delete old entries
        for (const row of toDelete.rows) {
          const entry = row as { id: number };
          await conn.execute({
            sql: "DELETE FROM PostHistory WHERE id = ?",
            args: [entry.id]
          });
        }
      }

      return {
        success: true,
        historyId: Number(result.lastInsertRowid)
      };
    }),

  // Get history for a post with reconstructed content
  getHistory: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = await getUserID(ctx.event.nativeEvent);

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be authenticated to view history"
        });
      }

      const conn = ConnectionFactory();

      // Verify post exists and user is author
      const postCheck = await conn.execute({
        sql: "SELECT author_id FROM Post WHERE id = ?",
        args: [input.postId]
      });

      if (postCheck.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found"
        });
      }

      const post = postCheck.rows[0] as { author_id: string };
      if (post.author_id !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to view this post's history"
        });
      }

      // Get all history entries for this post
      const result = await conn.execute({
        sql: `
          SELECT id, parent_id, content, created_at, is_saved
          FROM PostHistory
          WHERE post_id = ?
          ORDER BY created_at ASC
        `,
        args: [input.postId]
      });

      const entries = result.rows as Array<{
        id: number;
        parent_id: number | null;
        content: string;
        created_at: string;
        is_saved: number;
      }>;

      // Reconstruct content for each entry by applying diffs sequentially
      const historyWithContent: Array<{
        id: number;
        parent_id: number | null;
        content: string;
        created_at: string;
        is_saved: number;
      }> = [];

      let accumulatedContent = "";
      for (const entry of entries) {
        accumulatedContent = applyDiffPatch(accumulatedContent, entry.content);
        historyWithContent.push({
          id: entry.id,
          parent_id: entry.parent_id,
          content: accumulatedContent,
          created_at: entry.created_at,
          is_saved: entry.is_saved
        });
      }

      return historyWithContent;
    }),

  // Restore content from a history entry
  restore: publicProcedure
    .input(z.object({ historyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = await getUserID(ctx.event.nativeEvent);

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be authenticated to restore history"
        });
      }

      const conn = ConnectionFactory();

      // Get history entry and verify ownership
      const historyResult = await conn.execute({
        sql: `
          SELECT ph.post_id
          FROM PostHistory ph
          JOIN Post p ON ph.post_id = p.id
          WHERE ph.id = ?
        `,
        args: [input.historyId]
      });

      if (historyResult.rows.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "History entry not found"
        });
      }

      const historyEntry = historyResult.rows[0] as { post_id: number };

      // Verify user is post author
      const postCheck = await conn.execute({
        sql: "SELECT author_id FROM Post WHERE id = ?",
        args: [historyEntry.post_id]
      });

      const post = postCheck.rows[0] as { author_id: string };
      if (post.author_id !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to restore this post's history"
        });
      }

      // Reconstruct content from history chain
      const content = await reconstructContent(conn, input.historyId);

      return { content };
    })
});
