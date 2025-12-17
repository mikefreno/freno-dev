import { Show, Suspense, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { cache } from "@solidjs/router";
import { ConnectionFactory } from "~/server/utils";
import { HttpStatusCode } from "@solidjs/start";
import SessionDependantLike from "~/components/blog/SessionDependantLike";
import CommentIcon from "~/components/icons/CommentIcon";

// Server function to fetch post by title
const getPostByTitle = cache(async (title: string, privilegeLevel: string) => {
  "use server";
  
  const conn = ConnectionFactory();
  
  let query = "SELECT * FROM Post WHERE title = ?";
  if (privilegeLevel !== "admin") {
    query += ` AND published = TRUE`;
  }
  
  const postResults = await conn.execute({
    sql: query,
    args: [decodeURIComponent(title)],
  });
  
  const post = postResults.rows[0] as any;
  
  if (!post) {
    // Check if post exists but is unpublished
    const existQuery = "SELECT id FROM Post WHERE title = ?";
    const existRes = await conn.execute({
      sql: existQuery,
      args: [decodeURIComponent(title)],
    });
    
    if (existRes.rows[0]) {
      return { post: null, exists: true, comments: [], likes: [], tags: [], userCommentMap: new Map() };
    }
    
    return { post: null, exists: false, comments: [], likes: [], tags: [], userCommentMap: new Map() };
  }
  
  // Fetch comments
  const commentQuery = "SELECT * FROM Comment WHERE post_id = ?";
  const comments = (await conn.execute({ sql: commentQuery, args: [post.id] })).rows;
  
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
  
  const commenterQuery = "SELECT email, display_name, image FROM User WHERE id = ?";
  const commentIDToCommenterMap = new Map();
  
  for (const [key, value] of commenterToCommentIDMap.entries()) {
    const res = await conn.execute({ sql: commenterQuery, args: [key] });
    const user = res.rows[0];
    if (user) {
      commentIDToCommenterMap.set(user, value);
    }
  }
  
  // Get reaction map
  const reactionMap = new Map();
  for (const comment of comments) {
    const reactionQuery = "SELECT * FROM CommentReaction WHERE comment_id = ?";
    const res = await conn.execute({
      sql: reactionQuery,
      args: [(comment as any).id],
    });
    reactionMap.set((comment as any).id, res.rows);
  }
  
  return {
    post,
    exists: true,
    comments,
    likes,
    tags,
    topLevelComments: comments.filter((c: any) => c.parent_comment_id == null),
    userCommentMap: commentIDToCommenterMap,
    reactionMap,
  };
}, "post-by-title");

export default function PostPage() {
  const params = useParams();
  
  // TODO: Get actual privilege level and user ID from session/auth
  const privilegeLevel = "anonymous";
  const userID = null;
  
  const data = createAsync(() => getPostByTitle(params.title, privilegeLevel));
  
  const hasCodeBlock = (str: string): boolean => {
    return str.includes("<code") && str.includes("</code>");
  };

  return (
    <>
      <Suspense
        fallback={
          <div class="w-full pt-[30vh] text-center">
            <div class="text-xl">Loading post...</div>
          </div>
        }
      >
        <Show
          when={data()}
          fallback={
            <div class="w-full pt-[30vh]">
              <HttpStatusCode code={404} />
              <div class="text-center text-2xl">Post not found</div>
            </div>
          }
        >
          {(postData) => (
            <Show
              when={postData().post}
              fallback={
                <Show
                  when={postData().exists}
                  fallback={
                    <div class="w-full pt-[30vh]">
                      <HttpStatusCode code={404} />
                      <div class="text-center text-2xl">Post not found</div>
                    </div>
                  }
                >
                  <div class="w-full pt-[30vh]">
                    <div class="text-center text-2xl">
                      That post is in the works! Come back soon!
                    </div>
                    <div class="flex justify-center">
                      <A
                        href="/blog"
                        class="mt-4 rounded border border-orange-500 bg-orange-400 px-4 py-2 text-white shadow-md transition-all duration-300 ease-in-out hover:bg-orange-500 active:scale-90 dark:border-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800"
                      >
                        Back to Posts
                      </A>
                    </div>
                  </div>
                </Show>
              }
            >
              {(post) => {
                const p = post().post;
                return (
                  <>
                    <Title>{p.title.replaceAll("_", " ")} | Michael Freno</Title>
                    
                    <div class="select-none overflow-x-hidden">
                      <div class="z-30">
                        <div class="page-fade-in z-20 mx-auto h-80 sm:h-96 md:h-[50vh]">
                          <div class="image-overlay fixed h-80 w-full brightness-75 sm:h-96 md:h-[50vh]">
                            <img
                              src={p.banner_photo || "/blueprint.jpg"}
                              alt="post-cover"
                              class="h-80 w-full object-cover sm:h-96 md:h-[50vh]"
                            />
                          </div>
                          <div
                            class="text-shadow fixed top-36 z-10 w-full select-text text-center tracking-widest text-white brightness-150 sm:top-44 md:top-[20vh]"
                            style={{ "pointer-events": "none" }}
                          >
                            <div class="z-10 text-3xl font-light tracking-widest">
                              {p.title.replaceAll("_", " ")}
                              <div class="py-8 text-xl font-light tracking-widest">
                                {p.subtitle}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="relative z-40 bg-zinc-100 pb-24 dark:bg-zinc-800">
                        <div class="top-4 flex w-full flex-col justify-center md:absolute md:flex-row md:justify-between">
                          <div class="">
                            <div class="flex justify-center italic md:justify-start md:pl-24">
                              <div>
                                Written {new Date(p.date).toDateString()}
                                <br />
                                By Michael Freno
                              </div>
                            </div>
                            <div class="flex max-w-[420px] flex-wrap justify-center italic md:justify-start md:pl-24">
                              <For each={postData().tags as any[]}>
                                {(tag) => (
                                  <div class="group relative m-1 h-fit w-fit rounded-xl bg-purple-600 px-2 py-1 text-sm">
                                    <div class="text-white">{tag.value}</div>
                                  </div>
                                )}
                              </For>
                            </div>
                          </div>
                          
                          <div class="flex flex-row justify-center pt-4 md:pr-8 md:pt-0">
                            <a href="#comments" class="mx-2">
                              <div class="tooltip flex flex-col">
                                <div class="mx-auto">
                                  <CommentIcon strokeWidth={1} height={32} width={32} />
                                </div>
                                <div class="my-auto pl-2 pt-0.5 text-sm text-black dark:text-white">
                                  {postData().comments.length}{" "}
                                  {postData().comments.length === 1 ? "Comment" : "Comments"}
                                </div>
                              </div>
                            </a>
                            
                            <div class="mx-2">
                              <SessionDependantLike
                                currentUserID={userID}
                                privilegeLevel={privilegeLevel}
                                likes={postData().likes as any[]}
                                type={p.category === "project" ? "project" : "blog"}
                                projectID={p.id}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Post body */}
                        <div class="mx-auto max-w-4xl px-4 pt-32 md:pt-40">
                          <div class="prose dark:prose-invert max-w-none" innerHTML={p.body} />
                        </div>
                        
                        <Show when={privilegeLevel === "admin"}>
                          <div class="flex justify-center">
                            <A
                              class="z-100 h-fit rounded border border-blue-500 bg-blue-400 px-4 py-2 text-white shadow-md transition-all duration-300 ease-in-out hover:bg-blue-500 active:scale-90 dark:border-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                              href={`/blog/edit/${p.id}`}
                            >
                              Edit
                            </A>
                          </div>
                        </Show>
                        
                        {/* Comments section */}
                        <div id="comments" class="mx-4 pb-12 pt-12 md:mx-8 lg:mx-12">
                          <div class="mb-8 text-center text-2xl font-semibold">Comments</div>
                          <div class="mx-auto max-w-2xl rounded-lg border border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
                            <p class="mb-2 text-lg text-zinc-700 dark:text-zinc-300">
                              Comments coming soon!
                            </p>
                            <p class="text-sm text-zinc-500 dark:text-zinc-400">
                              We're working on implementing a comment system for this blog.
                            </p>
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
      </Suspense>
    </>
  );
}
