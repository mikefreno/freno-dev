import { Show, Suspense, For } from "solid-js";
import { useParams, A, Navigate, query } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import {
  ConnectionFactory,
  getUserID,
  getPrivilegeLevel
} from "~/server/utils";
import { getRequestEvent } from "solid-js/web";
import SessionDependantLike from "~/components/blog/SessionDependantLike";
import CommentIcon from "~/components/icons/CommentIcon";
import CommentSectionWrapper from "~/components/blog/CommentSectionWrapper";
import PostBodyClient from "~/components/blog/PostBodyClient";
import type { Comment, CommentReaction, UserPublicData } from "~/types/comment";
import { useBars } from "~/context/bars";
import { TerminalSplash } from "~/components/TerminalSplash";

// Server function to fetch post by title
const getPostByTitle = query(async (title: string) => {
  "use server";

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

  // Fetch comments
  const commentQuery = "SELECT * FROM Comment WHERE post_id = ?";
  const comments = (await conn.execute({ sql: commentQuery, args: [post.id] }))
    .rows;

  // Fetch likes
  const likeQuery = "SELECT * FROM PostLike WHERE post_id = ?";
  const likes = (await conn.execute({ sql: likeQuery, args: [post.id] })).rows;

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
    const reactionQuery = "SELECT * FROM CommentReaction WHERE comment_id = ?";
    const res = await conn.execute({
      sql: reactionQuery,
      args: [(comment as any).id]
    });
    reactionArray.push([(comment as any).id, res.rows as CommentReaction[]]);
  }

  return {
    post,
    exists: true,
    comments,
    likes,
    tags,
    topLevelComments: comments.filter((c: any) => c.parent_comment_id == null),
    userCommentArray,
    reactionArray,
    privilegeLevel,
    userID
  };
}, "post-by-title");

export default function PostPage() {
  const params = useParams();

  const data = createAsync(() => getPostByTitle(params.title));

  const hasCodeBlock = (str: string): boolean => {
    return str.includes("<code") && str.includes("</code>");
  };

  return (
    <>
      <Suspense fallback={<TerminalSplash />}>
        <Show when={data()} fallback={null}>
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
                const { centerWidth, leftBarSize } = useBars();

                return (
                  <>
                    <Title>
                      {p().title.replaceAll("_", " ")} | Michael Freno
                    </Title>

                    <div class="relative overflow-x-hidden">
                      {/* Fixed banner image background */}
                      <div class="fixed top-0 left-0 z-0 h-80 w-full sm:h-96 md:h-[50vh]">
                        <div class="absolute inset-0 h-full w-full overflow-hidden brightness-75">
                          <img
                            src={p().banner_photo || "/blueprint.jpg"}
                            alt="post-cover"
                            class="h-full object-cover select-none"
                            style={{
                              width: `${centerWidth()}px`,
                              "margin-left": `${leftBarSize()}px`,
                              "pointer-events": "none"
                            }}
                          />
                        </div>
                        <div
                          class="text-shadow text-text absolute top-1/3 z-10 my-auto px-4 text-center tracking-widest brightness-150 select-text"
                          style={{
                            width: `${centerWidth()}px`,
                            "margin-left": `${leftBarSize()}px`
                          }}
                        >
                          <div class="text-3xl font-light tracking-widest">
                            {p().title.replaceAll("_", " ")}
                            <div class="py-8 text-xl font-light tracking-widest">
                              {p().subtitle}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Spacer to push content down */}
                      <div class="h-80 sm:h-96 md:h-[50vh]"></div>

                      {/* Content that slides over the fixed image */}
                      <div class="bg-surface0 relative z-40 pb-24">
                        <div class="top-4 flex w-full flex-col justify-center md:absolute md:flex-row md:justify-between">
                          <div class="">
                            <div class="flex justify-center italic md:justify-start md:pl-24">
                              <div>
                                Written {new Date(p().date).toDateString()}
                                <br />
                                By Michael Freno
                              </div>
                            </div>
                            <div class="flex max-w-[420px] flex-wrap justify-center italic md:justify-start md:pl-24">
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
                              class="border-blue bg-blue z-100 h-fit rounded border px-4 py-2 text-base shadow-md transition-all duration-300 ease-in-out hover:brightness-125 active:scale-90"
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
                  </>
                );
              }}
            </Show>
          )}
        </Show>
      </Suspense>
    </>
  );
}
