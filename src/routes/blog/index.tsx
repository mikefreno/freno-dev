import { Show } from "solid-js";
import { useSearchParams, A, query } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import PostSortingSelect from "~/components/blog/PostSortingSelect";
import TagSelector from "~/components/blog/TagSelector";
import PostSorting from "~/components/blog/PostSorting";
import { TerminalSplash } from "~/components/TerminalSplash";

const getPosts = query(async () => {
  "use server";
  const { ConnectionFactory, getPrivilegeLevel } =
    await import("~/server/utils");
  const { withCache } = await import("~/server/cache");
  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);

  return withCache(`posts-${privilegeLevel}`, 5 * 60 * 1000, async () => {
    const conn = ConnectionFactory();

    // Fetch all posts with aggregated data
    let postsQuery = `
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
        COUNT(DISTINCT c.id) as total_comments
      FROM Post p
      LEFT JOIN PostLike pl ON p.id = pl.post_id
      LEFT JOIN Comment c ON p.id = c.post_id
    `;

    if (privilegeLevel !== "admin") {
      postsQuery += ` WHERE p.published = TRUE`;
    }

    postsQuery += ` GROUP BY p.id, p.title, p.subtitle, p.body, p.banner_photo, p.date, p.published, p.category, p.author_id, p.reads, p.attachments`;
    postsQuery += ` ORDER BY p.date ASC;`;

    const postsResult = await conn.execute(postsQuery);
    const posts = postsResult.rows;

    const tagsQuery = `
      SELECT t.value, t.post_id
      FROM Tag t
      JOIN Post p ON t.post_id = p.id
      ${privilegeLevel !== "admin" ? "WHERE p.published = TRUE" : ""}
      ORDER BY t.value ASC
    `;

    const tagsResult = await conn.execute(tagsQuery);
    const tags = tagsResult.rows;

    const tagMap: Record<string, number> = {};
    tags.forEach((tag: any) => {
      const key = `${tag.value}`;
      tagMap[key] = (tagMap[key] || 0) + 1;
    });

    return { posts, tags, tagMap, privilegeLevel };
  });
}, "posts");

export default function BlogIndex() {
  const [searchParams] = useSearchParams();

  const sort = () => searchParams.sort || "newest";
  const filters = () =>
    "filter" in searchParams ? searchParams.filter : undefined;
  const include = () =>
    "include" in searchParams ? searchParams.include : undefined;

  const data = createAsync(() => getPosts(), { deferStream: true });

  return (
    <>
      <Title>Blog | Michael Freno</Title>

      <div class="mx-auto py-16 pb-24">
        <Show when={data()} fallback={<TerminalSplash />}>
          {(loadedData) => (
            <>
              <div class="flex flex-row justify-around gap-4 px-4">
                <PostSortingSelect />

                <Show when={Object.keys(loadedData().tagMap).length > 0}>
                  <TagSelector tagMap={loadedData().tagMap} />
                </Show>

                <Show when={loadedData().privilegeLevel === "admin"}>
                  <div class="mt-2 flex justify-center md:mt-0 md:justify-end">
                    <A
                      href="/blog/create"
                      class="border-text rounded border px-4 py-2 text-center transition-all duration-300 ease-out hover:brightness-125 active:scale-90 md:mr-4"
                    >
                      Create Post
                    </A>
                  </div>
                </Show>
              </div>

              <Show
                when={loadedData().posts.length > 0}
                fallback={<div class="pt-12 text-center">No posts yet!</div>}
              >
                <div class="mx-auto flex w-11/12 flex-col pt-8">
                  <PostSorting
                    posts={loadedData().posts}
                    tags={loadedData().tags}
                    privilegeLevel={loadedData().privilegeLevel}
                    filters={filters()}
                    sort={sort()}
                    include={include()}
                  />
                </div>
              </Show>
            </>
          )}
        </Show>
      </div>
    </>
  );
}
