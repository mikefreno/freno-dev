import { createTRPCRouter, publicProcedure } from "../utils";
import { ConnectionFactory } from "~/server/utils";
import { withCache } from "~/server/cache";
import { postQueryInputSchema } from "~/server/api/schemas/blog";

export const blogRouter = createTRPCRouter({
  getRecentPosts: publicProcedure.query(async () => {
    return withCache("recent-posts", 10 * 60 * 1000, async () => {
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
    });
  }),

  getPosts: publicProcedure
    .input(postQueryInputSchema)
    .query(async ({ ctx, input }) => {
      const privilegeLevel = ctx.privilegeLevel;
      const { filters, sortBy } = input;

      // Create cache key based on filters and sort
      const cacheKey = `posts-${privilegeLevel}-${filters || "all"}-${sortBy}`;

      // Note: We're removing simple cache due to filtering/sorting variations
      // Consider implementing a more sophisticated cache strategy if needed

      const conn = ConnectionFactory();

      // Parse filter tags (pipe-separated)
      const filterTags = filters ? filters.split("|").filter(Boolean) : [];

      // Build base query
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

      // Build WHERE clause
      const whereClauses: string[] = [];
      const queryArgs: any[] = [];

      // Published filter (if not admin)
      if (privilegeLevel !== "admin") {
        whereClauses.push("p.published = TRUE");
      }

      // Tag filter (if provided)
      if (filterTags.length > 0) {
        // Use EXISTS subquery for tag filtering
        whereClauses.push(`
          EXISTS (
            SELECT 1 FROM Tag t2 
            WHERE t2.post_id = p.id 
            AND t2.value IN (${filterTags.map(() => "?").join(", ")})
          )
        `);
        queryArgs.push(...filterTags);
      }

      // Add WHERE clause if any conditions exist
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(" AND ")}`;
      }

      // Add GROUP BY
      query += ` GROUP BY p.id, p.title, p.subtitle, p.body, p.banner_photo, p.date, p.published, p.category, p.author_id, p.reads, p.attachments`;

      // Add ORDER BY based on sortBy parameter
      switch (sortBy) {
        case "newest":
          query += ` ORDER BY p.date DESC`;
          break;
        case "oldest":
          query += ` ORDER BY p.date ASC`;
          break;
        case "most_liked":
          query += ` ORDER BY total_likes DESC`;
          break;
        case "most_read":
          query += ` ORDER BY p.reads DESC`;
          break;
        case "most_comments":
          query += ` ORDER BY total_comments DESC`;
          break;
        default:
          query += ` ORDER BY p.date DESC`;
      }

      query += ";";

      // Execute query
      const results = await conn.execute({
        sql: query,
        args: queryArgs
      });
      const posts = results.rows;

      // Process tags into a map for the UI
      // Note: This includes ALL tags from filtered results
      let tagMap: Record<string, number> = {};
      posts.forEach((post: any) => {
        if (post.tags) {
          const postTags = post.tags.split(",");
          postTags.forEach((tag: string) => {
            tagMap[tag] = (tagMap[tag] || 0) + 1;
          });
        }
      });

      return { posts, tagMap, privilegeLevel };
    })
});
