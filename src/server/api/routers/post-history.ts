import { createTRPCRouter, publicProcedure } from "../utils";
import { ConnectionFactory } from "~/server/utils";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import diff from "fast-diff";

export function createDiffPatch(
  oldContent: string,
  newContent: string
): string {
  const changes = diff(oldContent, newContent);
  return JSON.stringify(changes);
}

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

async function reconstructContent(
  conn: ReturnType<typeof ConnectionFactory>,
  historyId: number
): Promise<string> {
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

  let content = "";
  for (const entry of chain) {
    content = applyDiffPatch(content, entry.content);
  }

  return content;
}

export const postHistoryRouter = createTRPCRouter({
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
      const userId = ctx.userId;

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

      const diffPatch = createDiffPatch(input.previousContent, input.content);

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

      const countResult = await conn.execute({
        sql: "SELECT COUNT(*) as count FROM PostHistory WHERE post_id = ?",
        args: [input.postId]
      });

      const count = (countResult.rows[0] as { count: number }).count;
      if (count > 100) {
        const toDelete = await conn.execute({
          sql: `
            SELECT id FROM PostHistory 
            WHERE post_id = ? 
            ORDER BY created_at ASC 
            LIMIT ?
          `,
          args: [input.postId, count - 100]
        });

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

  getHistory: publicProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be authenticated to view history"
        });
      }

      const conn = ConnectionFactory();

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

  restore: publicProcedure
    .input(z.object({ historyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.userId;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be authenticated to restore history"
        });
      }

      const conn = ConnectionFactory();

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

      const postCheck = await conn.execute({
        sql: "SELECT author_id FROM Post WHERE id = ?",
        args: [historyResult.post_id]
      });

      const post = postCheck.rows[0] as { author_id: string };
      if (post.author_id !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to restore this post's history"
        });
      }

      const content = await reconstructContent(conn, input.historyId);

      return { content };
    })
});
