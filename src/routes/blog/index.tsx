import { createSignal, Show, Suspense } from "solid-js";
import { useSearchParams, A } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { cache } from "@solidjs/router";
import { ConnectionFactory } from "~/server/utils";
import PostSortingSelect from "~/components/blog/PostSortingSelect";
import TagSelector from "~/components/blog/TagSelector";
import PostSorting from "~/components/blog/PostSorting";

// Server function to fetch posts
const getPosts = cache(async (category: string, privilegeLevel: string) => {
  "use server";

  let query = `
    SELECT
        Post.id,
        Post.title,
        Post.subtitle,
        Post.body,
        Post.banner_photo,
        Post.date,
        Post.published,
        Post.category,
        Post.author_id,
        Post.reads,
        Post.attachments,
    (SELECT COUNT(*) FROM PostLike WHERE Post.id = PostLike.post_id) AS total_likes,
    (SELECT COUNT(*) FROM Comment WHERE Post.id = Comment.post_id) AS total_comments
    FROM
        Post
    LEFT JOIN
        PostLike ON Post.id = PostLike.post_id
    LEFT JOIN
        Comment ON Post.id = Comment.post_id`;

  if (privilegeLevel !== "admin") {
    query += ` WHERE Post.published = TRUE`;
    if (category !== "all") {
      query += ` AND Post.category = '${category}'`;
    }
  } else {
    if (category !== "all") {
      query += ` WHERE Post.category = '${category}'`;
    }
  }
  query += ` GROUP BY Post.id, Post.title, Post.subtitle, Post.body, Post.banner_photo, Post.date, Post.published, Post.category, Post.author_id, Post.reads, Post.attachments ORDER BY Post.date DESC;`;

  const conn = ConnectionFactory();
  const results = await conn.execute(query);
  const posts = results.rows;

  const postIds = posts.map((post: any) => post.id);
  const tagQuery =
    postIds.length > 0
      ? `SELECT * FROM Tag WHERE post_id IN (${postIds.join(", ")})`
      : "SELECT * FROM Tag WHERE 1=0";
  const tagResults = await conn.execute(tagQuery);
  const tags = tagResults.rows;

  let tagMap: Record<string, number> = {};
  tags.forEach((tag: any) => {
    tagMap[tag.value] = (tagMap[tag.value] || 0) + 1;
  });

  return { posts, tags, tagMap };
}, "blog-posts");

export default function BlogIndex() {
  const [searchParams] = useSearchParams();

  // TODO: Get actual privilege level from session/auth
  const privilegeLevel = "anonymous";

  const category = () => searchParams.category || "all";
  const sort = () => searchParams.sort || "newest";
  const filters = () => searchParams.filter || "";

  const data = createAsync(() => getPosts(category(), privilegeLevel));

  const bannerImage = () =>
    category() === "project"
      ? "/blueprint.jpg"
      : "/manhattan-night-skyline.jpg";
  const pageTitle = () =>
    category() === "all"
      ? "Posts"
      : category() === "project"
        ? "Projects"
        : "Blog";

  return (
    <>
      <Title>{pageTitle()} | Michael Freno</Title>

      <div class="bg-base min-h-screen overflow-x-hidden">
        <div class="z-30">
          <div class="page-fade-in z-20 mx-auto h-80 sm:h-96 md:h-[30vh]">
            <div class="image-overlay fixed h-80 w-full brightness-75 sm:h-96 md:h-[50vh]">
              <img
                src={bannerImage()}
                alt="post-cover"
                class="h-80 w-full object-cover sm:h-96 md:h-[50vh]"
              />
            </div>
            <div
              class="text-shadow fixed top-36 z-10 w-full text-center tracking-widest text-white brightness-150 select-text sm:top-44 md:top-[20vh]"
              style={{ "pointer-events": "none" }}
            >
              <div class="z-10 text-5xl font-light tracking-widest">
                {pageTitle()}
              </div>
            </div>
          </div>
        </div>

        <div class="bg-surface0 relative z-40 mx-auto -mt-16 min-h-screen w-11/12 rounded-t-lg pt-8 pb-24 shadow-2xl sm:-mt-20 md:mt-0 md:w-5/6 lg:w-3/4">
          <Suspense
            fallback={
              <div class="mx-auto pt-48">
                <div class="text-center">Loading...</div>
              </div>
            }
          >
            <div class="flex flex-col justify-center gap-4 md:flex-row md:justify-around">
              <div class="flex justify-center gap-2 md:justify-start">
                <A
                  href="/blog?category=all"
                  class={`rounded border px-4 py-2 transition-all duration-300 ease-out active:scale-90 ${
                    category() === "all"
                      ? "border-peach bg-peach text-base"
                      : "border-text hover:brightness-125"
                  }`}
                >
                  All
                </A>
                <A
                  href="/blog?category=blog"
                  class={`rounded border px-4 py-2 transition-all duration-300 ease-out active:scale-90 ${
                    category() === "blog"
                      ? "border-peach bg-peach text-base"
                      : "border-text hover:brightness-125"
                  }`}
                >
                  Blog
                </A>
                <A
                  href="/blog?category=project"
                  class={`rounded border px-4 py-2 transition-all duration-300 ease-out active:scale-90 ${
                    category() === "project"
                      ? "border-blue bg-blue text-base"
                      : "border-text hover:brightness-125"
                  }`}
                >
                  Projects
                </A>
              </div>

              <PostSortingSelect
                type={category() === "project" ? "project" : "blog"}
              />

              <Show when={data() && Object.keys(data()!.tagMap).length > 0}>
                <TagSelector
                  tagMap={data()!.tagMap}
                  category={category() === "project" ? "project" : "blog"}
                />
              </Show>

              <Show when={privilegeLevel === "admin"}>
                <div class="mt-2 flex justify-center md:mt-0 md:justify-end">
                  <A
                    href="/blog/create"
                    class="border-text rounded border px-4 py-2 transition-all duration-300 ease-out hover:brightness-125 active:scale-90 md:mr-4"
                  >
                    Create Post
                  </A>
                </div>
              </Show>
            </div>
          </Suspense>

          <Suspense
            fallback={
              <div class="mx-auto pt-48">
                <div class="text-center">Loading posts...</div>
              </div>
            }
          >
            <Show
              when={data() && data()!.posts.length > 0}
              fallback={<div class="pt-12 text-center">No posts yet!</div>}
            >
              <div class="mx-auto flex w-11/12 flex-col pt-8">
                <PostSorting
                  posts={data()!.posts}
                  tags={data()!.tags}
                  privilegeLevel={privilegeLevel}
                  type={category() === "project" ? "project" : "blog"}
                  filters={filters()}
                  sort={sort()}
                />
              </div>
            </Show>
          </Suspense>
        </div>
      </div>
    </>
  );
}
