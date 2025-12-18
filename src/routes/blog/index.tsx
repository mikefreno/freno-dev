import { createSignal, Show, Suspense } from "solid-js";
import { useSearchParams, A } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { cache } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { ConnectionFactory, getPrivilegeLevel } from "~/server/utils";
import PostSortingSelect from "~/components/blog/PostSortingSelect";
import TagSelector from "~/components/blog/TagSelector";
import PostSorting from "~/components/blog/PostSorting";

// Server function to fetch posts
const getPosts = cache(async () => {
  "use server";

  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);

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

  return { posts, tags, tagMap, privilegeLevel };
}, "blog-posts");

export default function BlogIndex() {
  const [searchParams] = useSearchParams();

  const sort = () => searchParams.sort || "newest";
  const filters = () => searchParams.filter || "";

  const data = createAsync(() => getPosts());

  return (
    <>
      <Title>Blog | Michael Freno</Title>

      <div class="relative mx-auto min-h-screen rounded-t-lg pt-8 pb-24 shadow-2xl">
        <Suspense
          fallback={
            <div class="mx-auto pt-48">
              <div class="text-center">Loading...</div>
            </div>
          }
        >
          <div class="flex flex-col justify-center gap-4 md:flex-row md:justify-around">
            <PostSortingSelect />

            <Show when={data() && Object.keys(data()!.tagMap).length > 0}>
              <TagSelector tagMap={data()!.tagMap} />
            </Show>

            <Show when={data()?.privilegeLevel === "admin"}>
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
                privilegeLevel={data()!.privilegeLevel}
                filters={filters()}
                sort={sort()}
              />
            </div>
          </Show>
        </Suspense>
      </div>
    </>
  );
}
