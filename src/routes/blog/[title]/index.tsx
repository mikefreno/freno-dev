import { Show, For, createEffect } from "solid-js";
import {
  useParams,
  A,
  Navigate,
  query,
  useSearchParams
} from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import SessionDependantLike from "~/components/blog/SessionDependantLike";
import CommentIcon from "~/components/icons/CommentIcon";
import { Fire } from "~/components/icons/Fire";
import CommentSectionWrapper from "~/components/blog/CommentSectionWrapper";
import PostBodyClient from "~/components/blog/PostBodyClient";
import type { Comment, CommentReaction, UserPublicData } from "~/types/comment";
import { Spinner } from "~/components/Spinner";
import { api } from "~/lib/api";
import CustomScrollbar from "~/components/CustomScrollbar";
import "../post.css";
import { Post } from "~/db/types";

const getPostByTitle = query(
  async (
    title: string,
    sortBy: "newest" | "oldest" | "highest_rated" | "hot" = "newest"
  ) => {
    "use server";
    const { getUserState } = await import("~/lib/auth-query");
    const { ConnectionFactory } = await import("~/server/utils");
    const { parseConditionals, getSafeEnvVariables } =
      await import("~/server/conditional-parser");
    const { getFeatureFlags } = await import("~/server/feature-flags");
    const event = getRequestEvent()!;
    const userState = await getUserState();
    const privilegeLevel = userState.privilegeLevel;
    const userID = userState.userId;
    const conn = ConnectionFactory();

    if (title === "by-id") {
      const url = new URL(event.request.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return {
          post: null,
          exists: false,
          comments: [],
          likes: [],
          tags: [],
          userCommentArray: [],
          reactionArray: [],
          privilegeLevel: "anonymous" as const,
          userID: null
        };
      }

      const idQuery = "SELECT title FROM Post WHERE id = ?";
      const idResult = await conn.execute({
        sql: idQuery,
        args: [id]
      });

      const postData = idResult.rows[0] as any;
      if (postData?.title) {
        return {
          redirect: `/blog/${encodeURIComponent(postData.title)}${sortBy !== "newest" ? `?sortBy=${sortBy}` : ""}`
        };
      }

      return {
        post: null,
        exists: false,
        comments: [],
        likes: [],
        tags: [],
        userCommentArray: [],
        reactionArray: [],
        privilegeLevel: "anonymous" as const,
        userID: null
      };
    }

    let query = "SELECT * FROM Post WHERE title = ?";
    if (privilegeLevel !== "admin") {
      query += ` AND published = TRUE`;
    }

    const postResults = await conn.execute({
      sql: query,
      args: [decodeURIComponent(title)]
    });

    const post = postResults.rows[0] as any;

    if (!post) {
      const existQuery = "SELECT id FROM Post WHERE title = ?";
      const existRes = await conn.execute({
        sql: existQuery,
        args: [decodeURIComponent(title)]
      });

      if (existRes.rows[0]) {
        return {
          post: null,
          exists: true,
          comments: [],
          likes: [],
          tags: [],
          userCommentArray: [],
          reactionArray: [],
          privilegeLevel: "anonymous" as const,
          userID: null
        };
      }

      return {
        post: null,
        exists: false,
        comments: [],
        likes: [],
        tags: [],
        userCommentArray: [],
        reactionArray: [],
        privilegeLevel: "anonymous" as const,
        userID: null
      };
    }

    const conditionalContext = {
      isAuthenticated: userID !== null,
      privilegeLevel: privilegeLevel,
      userId: userID,
      currentDate: new Date(),
      featureFlags: getFeatureFlags(),
      env: getSafeEnvVariables()
    };

    if (post.body) {
      try {
        post.body = parseConditionals(post.body, conditionalContext);
      } catch (error) {
        console.error("Error parsing conditionals in post body:", error);
      }
    }

    let commentQuery = "SELECT * FROM Comment WHERE post_id = ?";

    switch (sortBy) {
      case "newest":
        commentQuery += " ORDER BY date DESC";
        break;
      case "oldest":
        commentQuery += " ORDER BY date ASC";
        break;
      case "highest_rated":
        commentQuery = `
        SELECT c.*,
          COALESCE((
            SELECT COUNT(*) FROM CommentReaction 
            WHERE comment_id = c.id 
            AND type IN ('tears', 'heartEye', 'moneyEye')
          ), 0) - COALESCE((
            SELECT COUNT(*) FROM CommentReaction 
            WHERE comment_id = c.id 
            AND type IN ('angry', 'sick', 'worried')
          ), 0) as net_score
        FROM Comment c
        WHERE c.post_id = ?
        ORDER BY net_score DESC, c.date DESC
      `;
        break;
      case "hot":
        commentQuery = `
        SELECT c.*,
          (COALESCE((
            SELECT COUNT(*) FROM CommentReaction 
            WHERE comment_id = c.id 
            AND type IN ('tears', 'heartEye', 'moneyEye')
          ), 0) - COALESCE((
            SELECT COUNT(*) FROM CommentReaction 
            WHERE comment_id = c.id 
            AND type IN ('angry', 'sick', 'worried')
          ), 0)) / 
          LOG10(((JULIANDAY('now') - JULIANDAY(c.date)) * 24) + 2) as hot_score
        FROM Comment c
        WHERE c.post_id = ?
        ORDER BY hot_score DESC, c.date DESC
      `;
        break;
    }

    const comments = (
      await conn.execute({ sql: commentQuery, args: [post.id] })
    ).rows;

    const likeQuery = "SELECT * FROM PostLike WHERE post_id = ?";
    const likes = (await conn.execute({ sql: likeQuery, args: [post.id] }))
      .rows;

    const tagQuery = "SELECT * FROM Tag WHERE post_id = ?";
    const tags = (await conn.execute({ sql: tagQuery, args: [post.id] })).rows;

    const commenterToCommentIDMap = new Map<string, number[]>();
    comments.forEach((comment: any) => {
      const prev = commenterToCommentIDMap.get(comment.commenter_id) || [];
      commenterToCommentIDMap.set(comment.commenter_id, [...prev, comment.id]);
    });

    const commenterQuery =
      "SELECT email, display_name, image FROM User WHERE id = ?";

    const userCommentArray: Array<[UserPublicData, number[]]> = [];

    for (const [key, value] of commenterToCommentIDMap.entries()) {
      const res = await conn.execute({ sql: commenterQuery, args: [key] });
      const user = res.rows[0];
      if (user) {
        userCommentArray.push([user as UserPublicData, value]);
      }
    }

    const reactionArray: Array<[number, CommentReaction[]]> = [];
    for (const comment of comments) {
      const reactionQuery =
        "SELECT * FROM CommentReaction WHERE comment_id = ?";
      const res = await conn.execute({
        sql: reactionQuery,
        args: [(comment as any).id]
      });
      reactionArray.push([(comment as any).id, res.rows as CommentReaction[]]);
    }

    const topLevelComments = comments.filter(
      (c: any) => c.parent_comment_id == null
    );

    return {
      post,
      exists: true,
      comments,
      likes,
      tags,
      topLevelComments,
      userCommentArray,
      reactionArray,
      privilegeLevel,
      userID,
      sortBy,
      reads: post.reads || 0
    };
  },
  "post-by-title"
);

export default function PostPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const data = createAsync(
    () => {
      const sortBy =
        (searchParams.sortBy as
          | "newest"
          | "oldest"
          | "highest_rated"
          | "hot") || "newest";
      return getPostByTitle(params.title, sortBy);
    },
    { deferStream: true }
  );

  createEffect(() => {
    const postData = data();
    if (postData?.post?.id) {
      api.blog.incrementPostRead
        .mutate({ postId: postData.post.id })
        .catch((err) => {
          console.error("Failed to increment read count:", err);
        });
    }
  });

  const hasCodeBlock = (str: string): boolean => {
    return str.includes("<code") && str.includes("</code>");
  };

  return (
    <Show
      when={data()}
      fallback={
        <div class="flex h-screen items-center justify-center">
          <Spinner size="xl" />
        </div>
      }
    >
      {(loadedData) => {
        if ("redirect" in loadedData()) {
          return <Navigate href={(loadedData() as any).redirect} />;
        }

        return (
          <Show
            when={loadedData().post as Post}
            fallback={<Navigate href="/404" />}
          >
            {(p) => {
              const postData = loadedData();

              const userCommentMap = new Map<UserPublicData, number[]>(
                postData.userCommentArray || []
              );
              const reactionMap = new Map<number, CommentReaction[]>(
                postData.reactionArray || []
              );

              return (
                <>
                  <PageHead
                    title={p().title.replaceAll("_", " ")}
                    description={
                      p().subtitle ||
                      `Read ${p().title.replaceAll("_", " ")} by Michael Freno on the freno.me blog.`
                    }
                  />

                  <div class="blog-overide relative -mt-16 overflow-x-hidden">
                    <div class="fixed inset-0 top-0 left-0 z-0 aspect-auto max-h-3/4 w-full overflow-hidden brightness-75 md:ml-62.5 md:max-h-[50vh] md:w-[calc(100vw-500px)]">
                      <img
                        src={p().banner_photo || "/blueprint.jpg"}
                        alt="post-cover"
                        class="h-full w-full object-cover select-none"
                        style={{
                          "pointer-events": "none"
                        }}
                      />
                      <div class="fixed top-24 z-50 m-auto w-full px-4 text-center tracking-widest text-white backdrop-blur-md select-text text-shadow-lg backdrop:brightness-50 sm:top-36 md:top-[20vh] md:w-[calc(100vw-500px)]">
                        <div class="py-8 text-3xl font-semibold tracking-widest">
                          {p().title.replaceAll("_", " ")}
                          <Show when={p().subtitle}>
                            <div class="py-8 text-xl font-light tracking-widest">
                              {p().subtitle}
                            </div>
                          </Show>
                        </div>
                      </div>
                    </div>

                    <div class="z-10 pt-80 backdrop-blur-[0.01px] sm:pt-96 md:pt-[50vh]">
                      <div class="bg-base relative pb-24">
                        <div class="flex w-full flex-col justify-center pt-8 lg:flex-row lg:items-start lg:justify-between">
                          <div class="flex flex-col gap-2 px-4 md:px-8">
                            <div class="flex flex-col text-center md:text-left">
                              <div class="text-sm italic">
                                Written {new Date(p().date).toDateString()}
                              </div>
                              <Show when={p().last_edited_date !== p().date}>
                                <div class="text-subtext0 text-xs italic">
                                  Edited:{" "}
                                  {new Date(
                                    p().last_edited_date
                                  ).toDateString()}
                                </div>
                              </Show>
                            </div>

                            <div class="text-center text-sm md:text-left">
                              By Michael Freno
                            </div>

                            <div class="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
                              <For each={postData.tags as any[]}>
                                {(tag) => {
                                  const tagValue = tag.value;
                                  return tagValue ? (
                                    <A
                                      href={`/blog?include=${encodeURIComponent(tagValue.split("#")[1])}`}
                                      class="bg-teal rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95 sm:text-sm"
                                    >
                                      {tagValue}
                                    </A>
                                  ) : null;
                                }}
                              </For>
                            </div>
                          </div>

                          <div class="flex flex-row justify-center gap-4 pt-6 lg:pt-0 lg:pr-8">
                            <div class="tooltip flex flex-col items-center">
                              <div>
                                <Fire
                                  height={32}
                                  width={32}
                                  color="var(--color-red)"
                                />
                              </div>
                              <div class="text-text pt-0.5 text-sm whitespace-nowrap">
                                {postData.reads || 0}{" "}
                                {postData.reads === 1 ? "Hit" : "Hits"}
                              </div>
                            </div>

                            <a href="#comments">
                              <button
                                onClick={() => {
                                  document
                                    .getElementById("comments")
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }}
                                class="tooltip flex flex-col items-center"
                              >
                                <div class="hover:brightness-125">
                                  <CommentIcon
                                    strokeWidth={1}
                                    height={32}
                                    width={32}
                                  />
                                </div>
                                <div class="text-text pt-0.5 text-sm whitespace-nowrap">
                                  {postData.comments.length}{" "}
                                  {postData.comments.length === 1
                                    ? "Comment"
                                    : "Comments"}
                                </div>
                              </button>
                            </a>

                            <div>
                              <SessionDependantLike
                                currentUserID={postData.userID}
                                privilegeLevel={postData.privilegeLevel}
                                likes={postData.likes as any[]}
                                projectID={p().id}
                              />
                            </div>
                          </div>
                        </div>
                        <div class="py-8 text-center text-2xl font-semibold tracking-widest">
                          {p().title.replaceAll("_", " ")}
                          <Show when={p().subtitle}>
                            <div class="py-8 text-xl font-light tracking-widest">
                              {p().subtitle}
                            </div>
                          </Show>
                        </div>

                        <PostBodyClient
                          body={p().body}
                          hasCodeBlock={hasCodeBlock(p().body)}
                        />

                        <div
                          id="comments"
                          class="mx-4 pt-12 pb-12 md:mx-8 lg:mx-12"
                        >
                          <CommentSectionWrapper
                            privilegeLevel={postData.privilegeLevel}
                            allComments={postData.comments as Comment[]}
                            topLevelComments={
                              postData.topLevelComments as Comment[]
                            }
                            id={p().id}
                            reactionMap={reactionMap}
                            currentUserID={postData.userID || ""}
                            userCommentMap={userCommentMap}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            }}
          </Show>
        );
      }}
    </Show>
  );
}
