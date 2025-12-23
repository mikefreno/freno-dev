import { Show, For } from "solid-js";
import {
  useParams,
  A,
  Navigate,
  query,
  useSearchParams
} from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import SessionDependantLike from "~/components/blog/SessionDependantLike";
import CommentIcon from "~/components/icons/CommentIcon";
import CommentSectionWrapper from "~/components/blog/CommentSectionWrapper";
import PostBodyClient from "~/components/blog/PostBodyClient";
import type { Comment, CommentReaction, UserPublicData } from "~/types/comment";
import { TerminalSplash } from "~/components/TerminalSplash";

// Server function to fetch post by title
const getPostByTitle = query(
  async (
    title: string,
    sortBy: "newest" | "oldest" | "highest_rated" | "hot" = "newest"
  ) => {
    "use server";
    const { ConnectionFactory, getUserID, getPrivilegeLevel } =
      await import("~/server/utils");
    const { parseConditionals, getSafeEnvVariables } =
      await import("~/server/conditional-parser");
    const { getFeatureFlags } = await import("~/server/feature-flags");
    const event = getRequestEvent()!;
    const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
    const userID = await getUserID(event.nativeEvent);
    const conn = ConnectionFactory();

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
      // Check if post exists but is unpublished
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

    // Build conditional evaluation context
    const conditionalContext = {
      isAuthenticated: userID !== null,
      privilegeLevel: privilegeLevel,
      userId: userID,
      currentDate: new Date(),
      featureFlags: getFeatureFlags(),
      env: getSafeEnvVariables()
    };

    // Parse conditionals in post body
    if (post.body) {
      try {
        post.body = parseConditionals(post.body, conditionalContext);
      } catch (error) {
        console.error("Error parsing conditionals in post body:", error);
        // Fall back to showing original content
      }
    }

    // Fetch comments with sorting
    let commentQuery = "SELECT * FROM Comment WHERE post_id = ?";

    // Build ORDER BY clause based on sortBy parameter
    switch (sortBy) {
      case "newest":
        commentQuery += " ORDER BY date DESC";
        break;
      case "oldest":
        commentQuery += " ORDER BY date ASC";
        break;
      case "highest_rated":
        // Calculate net score (upvotes - downvotes) for each comment
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
        // Calculate hot score: (upvotes - downvotes) / log10(age_in_hours + 2)
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

    // Fetch likes
    const likeQuery = "SELECT * FROM PostLike WHERE post_id = ?";
    const likes = (await conn.execute({ sql: likeQuery, args: [post.id] }))
      .rows;

    // Fetch tags
    const tagQuery = "SELECT * FROM Tag WHERE post_id = ?";
    const tags = (await conn.execute({ sql: tagQuery, args: [post.id] })).rows;

    // Build commenter map
    const commenterToCommentIDMap = new Map<string, number[]>();
    comments.forEach((comment: any) => {
      const prev = commenterToCommentIDMap.get(comment.commenter_id) || [];
      commenterToCommentIDMap.set(comment.commenter_id, [...prev, comment.id]);
    });

    const commenterQuery =
      "SELECT email, display_name, image FROM User WHERE id = ?";

    // Convert to serializable array format
    const userCommentArray: Array<[UserPublicData, number[]]> = [];

    for (const [key, value] of commenterToCommentIDMap.entries()) {
      const res = await conn.execute({ sql: commenterQuery, args: [key] });
      const user = res.rows[0];
      if (user) {
        userCommentArray.push([user as UserPublicData, value]);
      }
    }

    // Get reaction map as serializable array
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

    // Filter top-level comments (preserve sort order from SQL)
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
      sortBy
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

  const hasCodeBlock = (str: string): boolean => {
    return str.includes("<code") && str.includes("</code>");
  };

  return (
    <>
      <Show when={data()} fallback={<TerminalSplash />}>
        {(loadedData) => (
          <Show when={loadedData().post} fallback={<Navigate href="/404" />}>
            {(p) => {
              const postData = loadedData();

              // Convert arrays back to Maps for component
              const userCommentMap = new Map<UserPublicData, number[]>(
                postData.userCommentArray || []
              );
              const reactionMap = new Map<number, CommentReaction[]>(
                postData.reactionArray || []
              );

              return (
                <>
                  <Title>
                    {p().title.replaceAll("_", " ")} | Michael Freno
                  </Title>
                  <Meta
                    name="description"
                    content={
                      p().subtitle ||
                      `Read ${p().title.replaceAll("_", " ")} by Michael Freno on the freno.me blog.`
                    }
                  />

                  <div class="relative -mt-16 overflow-x-hidden">
                    {/* Fixed banner image background */}
                    <div class="fixed inset-0 top-0 left-0 z-0 h-full w-full overflow-hidden brightness-75 sm:h-96 md:ml-62.5 md:h-[50vh] md:w-[calc(100vw-500px)]">
                      <img
                        src={p().banner_photo || "/blueprint.jpg"}
                        alt="post-cover"
                        class="h-full w-full object-cover select-none"
                        style={{
                          "pointer-events": "none"
                        }}
                      />
                      <div class="text-text fixed top-1/3 z-50 m-auto w-full px-4 text-center tracking-widest backdrop-blur-xs select-text md:w-[calc(100vw-500px)]">
                        <div class="text-3xl font-light tracking-widest">
                          {p().title.replaceAll("_", " ")}
                          <div class="py-8 text-xl font-light tracking-widest">
                            {p().subtitle}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="z-10 pt-80 backdrop-blur-[0.01px] sm:pt-96 md:pt-[50vh]">
                      {/* Content that slides over the fixed image */}
                      <div class="bg-base relative pb-24">
                        <div class="top-4 flex w-full flex-col justify-center md:absolute md:flex-row md:justify-between">
                          <div class="">
                            <div class="flex justify-center italic md:justify-start md:pl-24">
                              <div>
                                Written {new Date(p().date).toDateString()}
                                <br />
                                By Michael Freno
                              </div>
                            </div>
                            <div class="flex max-w-105 flex-wrap justify-center italic md:justify-start md:pl-24">
                              <For each={postData.tags as any[]}>
                                {(tag) => (
                                  <div class="group relative m-1 h-fit w-fit rounded-xl bg-purple-600 px-2 py-1 text-sm">
                                    <div class="text-white">{tag.value}</div>
                                  </div>
                                )}
                              </For>
                            </div>
                          </div>

                          <div class="flex flex-row justify-center pt-4 md:pt-0 md:pr-8">
                            <a href="#comments" class="mx-2">
                              <div class="tooltip flex flex-col">
                                <div class="mx-auto hover:brightness-125">
                                  <CommentIcon
                                    strokeWidth={1}
                                    height={32}
                                    width={32}
                                  />
                                </div>
                                <div class="text-text my-auto pt-0.5 pl-2 text-sm">
                                  {postData.comments.length}{" "}
                                  {postData.comments.length === 1
                                    ? "Comment"
                                    : "Comments"}
                                </div>
                              </div>
                            </a>

                            <div class="mx-2">
                              <SessionDependantLike
                                currentUserID={postData.userID}
                                privilegeLevel={postData.privilegeLevel}
                                likes={postData.likes as any[]}
                                projectID={p().id}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Post body */}
                        <PostBodyClient
                          body={p().body}
                          hasCodeBlock={hasCodeBlock(p().body)}
                        />

                        <Show when={postData.privilegeLevel === "admin"}>
                          <div class="flex justify-center">
                            <A
                              class="border-blue bg-blue z-10 h-fit rounded border px-4 py-2 text-base shadow-md transition-all duration-300 ease-in-out hover:brightness-125 active:scale-90"
                              href={`/blog/edit/${p().id}`}
                            >
                              Edit
                            </A>
                          </div>
                        </Show>

                        {/* Comments section */}
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
        )}
      </Show>
    </>
  );
}
