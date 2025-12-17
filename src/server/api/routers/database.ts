import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";
import { ConnectionFactory } from "~/server/utils";
import { TRPCError } from "@trpc/server";
import { env } from "~/env/server";

export const databaseRouter = createTRPCRouter({
  // ============================================================
  // Comment Reactions Routes
  // ============================================================
  
  getCommentReactions: publicProcedure
    .input(z.object({ commentID: z.string() }))
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = "SELECT * FROM CommentReaction WHERE comment_id = ?";
        const results = await conn.execute({
          sql: query,
          args: [input.commentID],
        });
        return { commentReactions: results.rows };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comment reactions",
        });
      }
    }),

  addCommentReaction: publicProcedure
    .input(z.object({
      type: z.string(),
      comment_id: z.string(),
      user_id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `
          INSERT INTO CommentReaction (type, comment_id, user_id)
          VALUES (?, ?, ?)
        `;
        await conn.execute({
          sql: query,
          args: [input.type, input.comment_id, input.user_id],
        });
        
        const followUpQuery = `SELECT * FROM CommentReaction WHERE comment_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.comment_id],
        });
        
        return { commentReactions: res.rows };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add comment reaction",
        });
      }
    }),

  removeCommentReaction: publicProcedure
    .input(z.object({
      type: z.string(),
      comment_id: z.string(),
      user_id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `
          DELETE FROM CommentReaction
          WHERE type = ? AND comment_id = ? AND user_id = ?
        `;
        await conn.execute({
          sql: query,
          args: [input.type, input.comment_id, input.user_id],
        });

        const followUpQuery = `SELECT * FROM CommentReaction WHERE comment_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.comment_id],
        });
        
        return { commentReactions: res.rows };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove comment reaction",
        });
      }
    }),

  // ============================================================
  // Comments Routes
  // ============================================================

  getAllComments: publicProcedure
    .query(async () => {
      try {
        const conn = ConnectionFactory();
        const query = `SELECT * FROM Comment`;
        const res = await conn.execute(query);
        return { comments: res.rows };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comments",
        });
      }
    }),

  getCommentsByPostId: publicProcedure
    .input(z.object({ post_id: z.string() }))
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `SELECT * FROM Comment WHERE post_id = ?`;
        const res = await conn.execute({
          sql: query,
          args: [input.post_id],
        });
        return { comments: res.rows };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comments by post ID",
        });
      }
    }),

  // ============================================================
  // Post Routes
  // ============================================================

  getPostById: publicProcedure
    .input(z.object({
      category: z.enum(["blog", "project"]),
      id: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `SELECT * FROM Post WHERE id = ?`;
        const results = await conn.execute({
          sql: query,
          args: [input.id],
        });

        const tagQuery = `SELECT * FROM Tag WHERE post_id = ?`;
        const tagRes = await conn.execute({
          sql: tagQuery,
          args: [input.id],
        });

        if (results.rows[0]) {
          return {
            post: results.rows[0],
            tags: tagRes.rows,
          };
        } else {
          return { post: null, tags: [] };
        }
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch post by ID",
        });
      }
    }),

  getPostByTitle: publicProcedure
    .input(z.object({
      category: z.enum(["blog", "project"]),
      title: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const conn = ConnectionFactory();
        
        // Get post by title
        const postQuery = "SELECT * FROM Post WHERE title = ? AND category = ? AND published = ?";
        const postResults = await conn.execute({
          sql: postQuery,
          args: [input.title, input.category, true],
        });

        if (!postResults.rows[0]) {
          return null;
        }

        const post_id = (postResults.rows[0] as any).id;

        // Get comments
        const commentQuery = "SELECT * FROM Comment WHERE post_id = ?";
        const commentResults = await conn.execute({
          sql: commentQuery,
          args: [post_id],
        });

        // Get likes
        const likeQuery = "SELECT * FROM PostLike WHERE post_id = ?";
        const likeResults = await conn.execute({
          sql: likeQuery,
          args: [post_id],
        });

        // Get tags
        const tagsQuery = "SELECT * FROM Tag WHERE post_id = ?";
        const tagResults = await conn.execute({
          sql: tagsQuery,
          args: [post_id],
        });

        return {
          project: postResults.rows[0],
          comments: commentResults.rows,
          likes: likeResults.rows,
          tagResults: tagResults.rows,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch post by title",
        });
      }
    }),

  createPost: publicProcedure
    .input(z.object({
      category: z.enum(["blog", "project"]),
      title: z.string(),
      subtitle: z.string().nullable(),
      body: z.string().nullable(),
      banner_photo: z.string().nullable(),
      published: z.boolean(),
      tags: z.array(z.string()).nullable(),
      author_id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const fullURL = input.banner_photo 
          ? env.NEXT_PUBLIC_AWS_BUCKET_STRING + input.banner_photo 
          : null;

        const query = `
          INSERT INTO Post (title, category, subtitle, body, banner_photo, published, author_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          input.title,
          input.category,
          input.subtitle,
          input.body,
          fullURL,
          input.published,
          input.author_id,
        ];
        
        const results = await conn.execute({ sql: query, args: params });
        
        if (input.tags && input.tags.length > 0) {
          let tagQuery = "INSERT INTO Tag (value, post_id) VALUES ";
          let values = input.tags.map(
            (tag) => `("${tag}", ${results.lastInsertRowid})`
          );
          tagQuery += values.join(", ");
          await conn.execute(tagQuery);
        }

        return { data: results.lastInsertRowid };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create post",
        });
      }
    }),

  updatePost: publicProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().nullable().optional(),
      subtitle: z.string().nullable().optional(),
      body: z.string().nullable().optional(),
      banner_photo: z.string().nullable().optional(),
      published: z.boolean().nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      author_id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        
        let query = "UPDATE Post SET ";
        let params: any[] = [];
        let first = true;

        if (input.title !== undefined && input.title !== null) {
          query += first ? "title = ?" : ", title = ?";
          params.push(input.title);
          first = false;
        }

        if (input.subtitle !== undefined && input.subtitle !== null) {
          query += first ? "subtitle = ?" : ", subtitle = ?";
          params.push(input.subtitle);
          first = false;
        }

        if (input.body !== undefined && input.body !== null) {
          query += first ? "body = ?" : ", body = ?";
          params.push(input.body);
          first = false;
        }

        if (input.banner_photo !== undefined && input.banner_photo !== null) {
          query += first ? "banner_photo = ?" : ", banner_photo = ?";
          if (input.banner_photo === "_DELETE_IMAGE_") {
            params.push(null);
          } else {
            params.push(env.NEXT_PUBLIC_AWS_BUCKET_STRING + input.banner_photo);
          }
          first = false;
        }

        if (input.published !== undefined && input.published !== null) {
          query += first ? "published = ?" : ", published = ?";
          params.push(input.published);
          first = false;
        }

        query += first ? "author_id = ?" : ", author_id = ?";
        params.push(input.author_id);

        query += " WHERE id = ?";
        params.push(input.id);

        const results = await conn.execute({ sql: query, args: params });

        // Handle tags
        const deleteTagsQuery = `DELETE FROM Tag WHERE post_id = ?`;
        await conn.execute({ sql: deleteTagsQuery, args: [input.id.toString()] });
        
        if (input.tags && input.tags.length > 0) {
          let tagQuery = "INSERT INTO Tag (value, post_id) VALUES ";
          let values = input.tags.map((tag) => `("${tag}", ${input.id})`);
          tagQuery += values.join(", ");
          await conn.execute(tagQuery);
        }

        return { data: results.lastInsertRowid };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update post",
        });
      }
    }),

  // ============================================================
  // Post Likes Routes
  // ============================================================

  addPostLike: publicProcedure
    .input(z.object({
      user_id: z.string(),
      post_id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `INSERT INTO PostLike (user_id, post_id) VALUES (?, ?)`;
        await conn.execute({
          sql: query,
          args: [input.user_id, input.post_id],
        });

        const followUpQuery = `SELECT * FROM PostLike WHERE post_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.post_id],
        });

        return { newLikes: res.rows };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add post like",
        });
      }
    }),

  removePostLike: publicProcedure
    .input(z.object({
      user_id: z.string(),
      post_id: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `
          DELETE FROM PostLike
          WHERE user_id = ? AND post_id = ?
        `;
        await conn.execute({
          sql: query,
          args: [input.user_id, input.post_id],
        });

        const followUpQuery = `SELECT * FROM PostLike WHERE post_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.post_id],
        });

        return { newLikes: res.rows };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove post like",
        });
      }
    }),

  // ============================================================
  // User Routes
  // ============================================================

  getUserById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = "SELECT * FROM User WHERE id = ?";
        const res = await conn.execute({
          sql: query,
          args: [input.id],
        });

        if (res.rows[0]) {
          const user = res.rows[0] as any;
          if (user && user.display_name !== "user deleted") {
            return {
              id: user.id,
              email: user.email,
              emailVerified: user.email_verified,
              image: user.image,
              displayName: user.display_name,
              provider: user.provider,
              hasPassword: !!user.password_hash,
            };
          }
        }
        return null;
      } catch (error) {
        console.error(error);
        return null;
      }
    }),

  getUserPublicData: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = "SELECT email, display_name, image FROM User WHERE id = ?";
        const res = await conn.execute({
          sql: query,
          args: [input.id],
        });

        if (res.rows[0]) {
          const user = res.rows[0] as any;
          if (user && user.display_name !== "user deleted") {
            return {
              email: user.email,
              image: user.image,
              display_name: user.display_name,
            };
          }
        }
        return null;
      } catch (error) {
        console.error(error);
        return null;
      }
    }),

  getUserImage: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = "SELECT * FROM User WHERE id = ?";
        const results = await conn.execute({
          sql: query,
          args: [input.id],
        });
        return { user: results.rows[0] };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user image",
        });
      }
    }),

  updateUserImage: publicProcedure
    .input(z.object({
      id: z.string(),
      imageURL: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const fullURL = input.imageURL
          ? env.NEXT_PUBLIC_AWS_BUCKET_STRING + input.imageURL
          : null;
        const query = `UPDATE User SET image = ? WHERE id = ?`;
        await conn.execute({
          sql: query,
          args: [fullURL, input.id],
        });
        return { res: "success" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user image",
        });
      }
    }),

  updateUserEmail: publicProcedure
    .input(z.object({
      id: z.string(),
      newEmail: z.string().email(),
      oldEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `UPDATE User SET email = ? WHERE id = ? AND email = ?`;
        const res = await conn.execute({
          sql: query,
          args: [input.newEmail, input.id, input.oldEmail],
        });
        return { res };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user email",
        });
      }
    }),
});
