import { createTRPCRouter, publicProcedure } from "../utils";
import { ConnectionFactory } from "~/server/utils";

// Simple in-memory cache for blog posts to reduce DB load
let cachedPosts: {
  posts: any[];
  tagMap: Record<string, number>;
  privilegeLevel: string;
} | null = null;
let cacheTimestamp: number = 0;

export const blogRouter = createTRPCRouter({
  getRecentPosts: publicProcedure.query(async () => {
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
    return results.rows;
  }),

  getPosts: publicProcedure.query(async ({ ctx }) => {
    const privilegeLevel = ctx.privilegeLevel;

    // Check if we have fresh cached data (cache duration: 30 seconds)
    const now = Date.now();
    if (cachedPosts && now - cacheTimestamp < 30000) {
      return cachedPosts;
    }

    // Single optimized query using JOINs instead of subqueries and separate queries
    let query = `
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
        COUNT(DISTINCT c.id) as total_comments,
        GROUP_CONCAT(t.value) as tags
      FROM Post p
      LEFT JOIN PostLike pl ON p.id = pl.post_id
      LEFT JOIN Comment c ON p.id = c.post_id
      LEFT JOIN Tag t ON p.id = t.post_id`;

    if (privilegeLevel !== "admin") {
      query += ` WHERE p.published = TRUE`;
    }
    query += ` GROUP BY p.id, p.title, p.subtitle, p.body, p.banner_photo, p.date, p.published, p.category, p.author_id, p.reads, p.attachments ORDER BY p.date DESC;`;

    const conn = ConnectionFactory();
    const results = await conn.execute(query);
    const posts = results.rows;

    // Process tags into a map for the UI
    let tagMap: Record<string, number> = {};
    posts.forEach((post: any) => {
      if (post.tags) {
        const postTags = post.tags.split(",");
        postTags.forEach((tag: string) => {
          tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
      }
    });

    // Cache the results
    cachedPosts = { posts, tagMap, privilegeLevel };
    cacheTimestamp = now;

    return cachedPosts;
  })
});
