import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure
} from "../utils";
import { z } from "zod";
import { ConnectionFactory } from "~/server/utils";
import { TRPCError } from "@trpc/server";
import { env } from "~/env/server";
import { cache, withCacheAndStale } from "~/server/cache";
import type {
  Comment,
  CommentReaction,
  Post,
  PostLike,
  User,
  Tag
} from "~/db/types";
import {
  getCommentReactionsQuerySchema,
  toggleCommentReactionMutationSchema,
  deleteCommentWithTypeSchema,
  getCommentsByPostIdSchema,
  getPostByIdSchema,
  getPostByTitleSchema,
  createPostSchema,
  updatePostSchema,
  idSchema,
  togglePostLikeMutationSchema,
  getUserByIdSchema,
  updateUserImageSchema,
  updateUserEmailSchema
} from "../schemas/database";

const BLOG_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const databaseRouter = createTRPCRouter({
  getCommentReactions: publicProcedure
    .input(getCommentReactionsQuerySchema)
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = "SELECT * FROM CommentReaction WHERE comment_id = ?";
        const results = await conn.execute({
          sql: query,
          args: [input.commentID]
        });
        return {
          commentReactions: results.rows as unknown as CommentReaction[]
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comment reactions"
        });
      }
    }),

  addCommentReaction: publicProcedure
    .input(toggleCommentReactionMutationSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `
          INSERT INTO CommentReaction (type, comment_id, user_id)
          VALUES (?, ?, ?)
        `;
        await conn.execute({
          sql: query,
          args: [input.type, input.comment_id, input.user_id]
        });

        const followUpQuery = `SELECT * FROM CommentReaction WHERE comment_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.comment_id]
        });

        return { commentReactions: res.rows as unknown as CommentReaction[] };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add comment reaction"
        });
      }
    }),

  removeCommentReaction: publicProcedure
    .input(toggleCommentReactionMutationSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `
          DELETE FROM CommentReaction
          WHERE type = ? AND comment_id = ? AND user_id = ?
        `;
        await conn.execute({
          sql: query,
          args: [input.type, input.comment_id, input.user_id]
        });

        const followUpQuery = `SELECT * FROM CommentReaction WHERE comment_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.comment_id]
        });

        return { commentReactions: res.rows as unknown as CommentReaction[] };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove comment reaction"
        });
      }
    }),

  getAllComments: publicProcedure.query(async () => {
    try {
      const conn = ConnectionFactory();
      const query = `
          SELECT c.*, p.title as post_title 
          FROM Comment c 
          JOIN Post p ON c.post_id = p.id
          ORDER BY c.created_at DESC
        `;
      const res = await conn.execute(query);
      return { comments: res.rows };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch comments"
      });
    }
  }),

  deleteComment: protectedProcedure
    .input(deleteCommentWithTypeSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const conn = ConnectionFactory();

        console.log("[deleteComment] Starting deletion:", {
          commentID: input.commentID,
          deletionType: input.deletionType,
          userId: ctx.userId,
          privilegeLevel: ctx.privilegeLevel
        });

        const commentQuery = await conn.execute({
          sql: "SELECT * FROM Comment WHERE id = ?",
          args: [input.commentID]
        });

        const comment = commentQuery.rows[0] as any;
        if (!comment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Comment not found"
          });
        }

        const isOwner = comment.commenter_id === ctx.userId;
        const isAdmin = ctx.privilegeLevel === "admin";

        console.log("[deleteComment] Authorization check:", {
          isOwner,
          isAdmin,
          commentOwner: comment.commenter_id,
          requestingUser: ctx.userId
        });

        if (input.deletionType === "user" && !isOwner && !isAdmin) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete your own comments"
          });
        }

        if (
          (input.deletionType === "admin" ||
            input.deletionType === "database") &&
          !isAdmin
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admin access required for this deletion type"
          });
        }

        if (input.deletionType === "database") {
          console.log("[deleteComment] Performing database deletion");
          await conn.execute({
            sql: "DELETE FROM CommentReaction WHERE comment_id = ?",
            args: [input.commentID]
          });

          await conn.execute({
            sql: "DELETE FROM Comment WHERE id = ?",
            args: [input.commentID]
          });

          console.log("[deleteComment] Database deletion successful");
          return {
            success: true,
            deletionType: "database",
            commentBody: null
          };
        } else if (input.deletionType === "admin") {
          console.log("[deleteComment] Performing admin deletion");
          await conn.execute({
            sql: "UPDATE Comment SET body = ?, commenter_id = ? WHERE id = ?",
            args: ["[deleted by admin]", "", input.commentID]
          });

          console.log("[deleteComment] Admin deletion successful");
          return {
            success: true,
            deletionType: "admin",
            commentBody: "[deleted by admin]"
          };
        } else {
          console.log("[deleteComment] Performing user deletion");
          await conn.execute({
            sql: "UPDATE Comment SET body = ?, commenter_id = ? WHERE id = ?",
            args: ["[deleted]", "", input.commentID]
          });

          console.log("[deleteComment] User deletion successful");
          return {
            success: true,
            deletionType: "user",
            commentBody: "[deleted]"
          };
        }
      } catch (error) {
        console.error("[deleteComment] Failed to delete comment:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete comment"
        });
      }
    }),

  getCommentsByPostId: publicProcedure
    .input(getCommentsByPostIdSchema)
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `
           SELECT c.*, p.title as post_title 
           FROM Comment c 
           JOIN Post p ON c.post_id = p.id
           WHERE c.post_id = ?
           ORDER BY c.created_at DESC
         `;
        const res = await conn.execute({
          sql: query,
          args: [input.post_id]
        });
        return { comments: res.rows as unknown as Comment[] };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch comments by post ID"
        });
      }
    }),

  getPostById: publicProcedure
    .input(getPostByIdSchema)
    .query(async ({ input }) => {
      return withCacheAndStale(
        `blog-post-id-${input.id}`,
        BLOG_CACHE_TTL,
        async () => {
          try {
            const conn = ConnectionFactory();
            const query = `
               SELECT p.*, t.value as tag_value 
               FROM Post p 
               LEFT JOIN Tag t ON p.id = t.post_id 
               WHERE p.id = ?
             `;
            const results = await conn.execute({
              sql: query,
              args: [input.id]
            });

            if (results.rows[0]) {
              const post = results.rows[0];
              const tags = results.rows
                .filter((row) => row.tag_value)
                .map((row) => row.tag_value);

              return {
                post,
                tags
              };
            } else {
              return { post: null, tags: [] };
            }
          } catch (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch post by ID"
            });
          }
        }
      );
    }),

  getPostByTitle: publicProcedure
    .input(getPostByTitleSchema)
    .query(async ({ input, ctx }) => {
      return withCacheAndStale(
        `blog-post-title-${input.title}`,
        BLOG_CACHE_TTL,
        async () => {
          try {
            const conn = ConnectionFactory();

            const postQuery = `
               SELECT 
                 p.*,
                 COUNT(DISTINCT c.id) as comment_count,
                 COUNT(DISTINCT pl.user_id) as like_count,
                 GROUP_CONCAT(t.value) as tags
               FROM Post p
               LEFT JOIN Comment c ON p.id = c.post_id
               LEFT JOIN PostLike pl ON p.id = pl.post_id
               LEFT JOIN Tag t ON p.id = t.post_id
               WHERE p.title = ? AND p.category = ? AND p.published = ?
               GROUP BY p.id
             `;
            const postResults = await conn.execute({
              sql: postQuery,
              args: [input.title, input.category, true]
            });

            if (!postResults.rows[0]) {
              return null;
            }

            const postRow = postResults.rows[0];

            return {
              post: postRow,
              comments: [], // Comments are not included in this optimized query - would need separate call if needed
              likes: [], // Likes are not included in this optimized query - would need separate call if needed
              tags: postRow.tags ? postRow.tags.split(",") : []
            };
          } catch (error) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to fetch post by title"
            });
          }
        }
      );
    }),

  createPost: publicProcedure
    .input(
      z.object({
        category: z.literal("blog"),
        title: z.string(),
        subtitle: z.string().nullable(),
        body: z.string().nullable(),
        banner_photo: z.string().nullable(),
        published: z.boolean(),
        tags: z.array(z.string()).nullable(),
        author_id: z.string()
      })
    )
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const fullURL = input.banner_photo
          ? env.VITE_AWS_BUCKET_STRING + input.banner_photo
          : null;

        const now = new Date().toISOString();
        const publishDate = input.published ? now : null;

        const query = `
          INSERT INTO Post (title, category, subtitle, body, banner_photo, date, published, author_id, last_edited_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          input.title,
          input.category,
          input.subtitle,
          input.body,
          fullURL,
          publishDate,
          input.published,
          input.author_id,
          now
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

        cache.deleteByPrefix("blog-");

        return { data: results.lastInsertRowid };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create post"
        });
      }
    }),

  updatePost: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().nullable().optional(),
        subtitle: z.string().nullable().optional(),
        body: z.string().nullable().optional(),
        banner_photo: z.string().nullable().optional(),
        published: z.boolean().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        author_id: z.string()
      })
    )
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();

        // Check if post is being published for the first time
        let shouldSetPublishDate = false;
        if (input.published !== undefined && input.published !== null) {
          const currentPostQuery = await conn.execute({
            sql: "SELECT published, date FROM Post WHERE id = ?",
            args: [input.id]
          });
          const currentPost = currentPostQuery.rows[0] as any;

          // Set publish date if transitioning from unpublished to published and date is null
          if (
            currentPost &&
            !currentPost.published &&
            input.published &&
            !currentPost.date
          ) {
            shouldSetPublishDate = true;
          }
        }

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
            params.push(env.VITE_AWS_BUCKET_STRING + input.banner_photo);
          }
          first = false;
        }

        if (input.published !== undefined && input.published !== null) {
          query += first ? "published = ?" : ", published = ?";
          params.push(input.published);
          first = false;
        }

        // Set date if publishing for the first time
        if (shouldSetPublishDate) {
          query += first ? "date = ?" : ", date = ?";
          params.push(new Date().toISOString());
          first = false;
        }

        // Always update last_edited_date
        query += first ? "last_edited_date = ?" : ", last_edited_date = ?";
        params.push(new Date().toISOString());
        first = false;

        query += first ? "author_id = ?" : ", author_id = ?";
        params.push(input.author_id);

        query += " WHERE id = ?";
        params.push(input.id);

        const results = await conn.execute({ sql: query, args: params });

        const deleteTagsQuery = `DELETE FROM Tag WHERE post_id = ?`;
        await conn.execute({
          sql: deleteTagsQuery,
          args: [input.id.toString()]
        });

        if (input.tags && input.tags.length > 0) {
          let tagQuery = "INSERT INTO Tag (value, post_id) VALUES ";
          let values = input.tags.map((tag) => `("${tag}", ${input.id})`);
          tagQuery += values.join(", ");
          await conn.execute(tagQuery);
        }

        cache.deleteByPrefix("blog-");

        return { data: results.lastInsertRowid };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update post"
        });
      }
    }),

  deletePost: publicProcedure.input(idSchema).mutation(async ({ input }) => {
    try {
      const conn = ConnectionFactory();

      await conn.execute({
        sql: "DELETE FROM Tag WHERE post_id = ?",
        args: [input.id.toString()]
      });

      await conn.execute({
        sql: "DELETE FROM PostLike WHERE post_id = ?",
        args: [input.id.toString()]
      });

      await conn.execute({
        sql: "DELETE FROM Comment WHERE post_id = ?",
        args: [input.id]
      });

      await conn.execute({
        sql: "DELETE FROM Post WHERE id = ?",
        args: [input.id]
      });

      cache.deleteByPrefix("blog-");

      return { success: true };
    } catch (error) {
      console.error(error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete post"
      });
    }
  }),

  // ============================================================
  // Post Likes Routes
  // ============================================================

  addPostLike: publicProcedure
    .input(togglePostLikeMutationSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `INSERT INTO PostLike (user_id, post_id) VALUES (?, ?)`;
        await conn.execute({
          sql: query,
          args: [input.user_id, input.post_id]
        });

        const followUpQuery = `SELECT * FROM PostLike WHERE post_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.post_id]
        });

        return { newLikes: res.rows as unknown as PostLike[] };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add post like"
        });
      }
    }),

  removePostLike: publicProcedure
    .input(togglePostLikeMutationSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `
          DELETE FROM PostLike
          WHERE user_id = ? AND post_id = ?
        `;
        await conn.execute({
          sql: query,
          args: [input.user_id, input.post_id]
        });

        const followUpQuery = `SELECT * FROM PostLike WHERE post_id = ?`;
        const res = await conn.execute({
          sql: followUpQuery,
          args: [input.post_id]
        });

        return { newLikes: res.rows as unknown as PostLike[] };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove post like"
        });
      }
    }),

  // ============================================================
  // User Routes
  // ============================================================

  getUserById: publicProcedure
    .input(getUserByIdSchema)
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = "SELECT * FROM User WHERE id = ?";
        const res = await conn.execute({
          sql: query,
          args: [input.id]
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
              hasPassword: !!user.password_hash
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
    .input(getUserByIdSchema)
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query =
          "SELECT email, display_name, image FROM User WHERE id = ?";
        const res = await conn.execute({
          sql: query,
          args: [input.id]
        });

        if (res.rows[0]) {
          const user = res.rows[0] as any;
          if (user && user.display_name !== "user deleted") {
            return {
              email: user.email,
              image: user.image,
              display_name: user.display_name
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
    .input(getUserByIdSchema)
    .query(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = "SELECT * FROM User WHERE id = ?";
        const results = await conn.execute({
          sql: query,
          args: [input.id]
        });
        return { user: results.rows[0] };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user image"
        });
      }
    }),

  updateUserImage: publicProcedure
    .input(updateUserImageSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const fullURL = input.imageURL
          ? env.VITE_AWS_BUCKET_STRING + input.imageURL
          : null;
        const query = `UPDATE User SET image = ? WHERE id = ?`;
        await conn.execute({
          sql: query,
          args: [fullURL, input.id]
        });
        return { res: "success" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user image"
        });
      }
    }),

  updateUserEmail: publicProcedure
    .input(updateUserEmailSchema)
    .mutation(async ({ input }) => {
      try {
        const conn = ConnectionFactory();
        const query = `UPDATE User SET email = ? WHERE id = ? AND email = ?`;
        const res = await conn.execute({
          sql: query,
          args: [input.newEmail, input.id, input.oldEmail]
        });
        return { res };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user email"
        });
      }
    })
});
