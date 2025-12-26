import { createTRPCRouter, publicProcedure } from "../utils";
import { ConnectionFactory } from "~/server/utils";
import { withCacheAndStale } from "~/server/cache";
import { incrementPostReadSchema } from "../schemas/blog";
import type { Post, PostWithCommentsAndLikes } from "~/db/types";

const BLOG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const blogRouter = createTRPCRouter({
  getRecentPosts: publicProcedure.query(async () => {
    return withCacheAndStale("blog-recent-posts", BLOG_CACHE_TTL, async () => {
      // Get database connection
      const conn = ConnectionFactory();

      // Query for the 3 most recent published posts
      const query = `
      SELECT 
        p.id,
        p.title,
        p.subtitle,
        p.date,
        p.published,
        p.category,
        p.author_id,
        p.banner_photo,
        p.reads,
        COUNT(DISTINCT pl.user_id) as total_likes,
        COUNT(DISTINCT c.id) as total_comments
      FROM Post p
      LEFT JOIN PostLike pl ON p.id = pl.post_id
      LEFT JOIN Comment c ON p.id = c.post_id
      WHERE p.published = TRUE
      GROUP BY p.id, p.title, p.subtitle, p.date, p.published, p.category, p.author_id, p.reads
      ORDER BY p.date DESC
      LIMIT 3;
    `;

      const results = await conn.execute(query);
      return results.rows as unknown as PostWithCommentsAndLikes[];
    });
  }),

  getPosts: publicProcedure.query(async ({ ctx }) => {
    const privilegeLevel = ctx.privilegeLevel;

    return withCacheAndStale(
      `blog-posts-${privilegeLevel}`,
      BLOG_CACHE_TTL,
      async () => {
        const conn = ConnectionFactory();

        // Fetch all posts with aggregated data
        let postsQuery = `
        SELECT 
          p.id,
          p.title,
          p.subtitle,
          p.body,
          p.banner_photo,
          p.date,
          p.published,
          p.category,
          p.author_id,
          p.reads,
          p.attachments,
          COUNT(DISTINCT pl.user_id) as total_likes,
          COUNT(DISTINCT c.id) as total_comments
        FROM Post p
        LEFT JOIN PostLike pl ON p.id = pl.post_id
        LEFT JOIN Comment c ON p.id = c.post_id
      `;

        if (privilegeLevel !== "admin") {
          postsQuery += ` WHERE p.published = TRUE`;
        }

        postsQuery += ` GROUP BY p.id, p.title, p.subtitle, p.body, p.banner_photo, p.date, p.published, p.category, p.author_id, p.reads, p.attachments`;
        postsQuery += ` ORDER BY p.date ASC;`;

        const postsResult = await conn.execute(postsQuery);
        const posts = postsResult.rows as unknown as PostWithCommentsAndLikes[];

        const tagsQuery = `
        SELECT t.value, t.post_id
        FROM Tag t
        JOIN Post p ON t.post_id = p.id
        ${privilegeLevel !== "admin" ? "WHERE p.published = TRUE" : ""}
        ORDER BY t.value ASC
      `;

        const tagsResult = await conn.execute(tagsQuery);
        const tags = tagsResult.rows as unknown as {
          value: string;
          post_id: number;
        }[];

        const tagMap: Record<string, number> = {};
        tags.forEach((tag) => {
          const key = `${tag.value}`;
          tagMap[key] = (tagMap[key] || 0) + 1;
        });

        return { posts, tags, tagMap, privilegeLevel };
      }
    );
  }),

  incrementPostRead: publicProcedure
    .input(incrementPostReadSchema)
    .mutation(async ({ input }) => {
      const conn = ConnectionFactory();

      await conn.execute({
        sql: "UPDATE Post SET reads = reads + 1 WHERE id = ?",
        args: [input.postId]
      });

      return { success: true };
    })
});
