import { Show, Suspense } from "solid-js";
import { useSearchParams, A, query } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { ConnectionFactory, getPrivilegeLevel } from "~/server/utils";
import PostSortingSelect from "~/components/blog/PostSortingSelect";
import TagSelector from "~/components/blog/TagSelector";
import PostSorting from "~/components/blog/PostSorting";

// Simple in-memory cache for blog posts to reduce DB load
let cachedPosts: {
  posts: any[];
  tagMap: Record<string, number>;
  privilegeLevel: string;
} | null = null;
let cacheTimestamp: number = 0;

// Server function to fetch posts
const getPosts = query(async () => {
  "use server";

  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);

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
