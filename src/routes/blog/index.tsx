import { Show, createSignal, onMount, lazy } from "solid-js";
import { useSearchParams, A, query } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import PostSortingSelect from "~/components/blog/PostSortingSelect";
import TagSelector from "~/components/blog/TagSelector";
import PostSorting from "~/components/blog/PostSorting";
import { TerminalSplash } from "~/components/TerminalSplash";
import { CACHE_CONFIG } from "~/config";

const PublishStatusToggle = lazy(() => import("~/components/blog/PublishStatusToggle"));

const POSTS_PER_PAGE = 12;

// Separate query for all tags (needed for TagSelector)
const getAllTags = query(async () => {
  "use server";
  const { ConnectionFactory, getPrivilegeLevel } =
    await import("~/server/utils");
  const { withCache } = await import("~/server/cache");
  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);

  return withCache(
    `all-tags-${privilegeLevel}`,
    CACHE_CONFIG.BLOG_POSTS_LIST_CACHE_TTL_MS,
    async () => {
      const conn = ConnectionFactory();

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

      return { tagMap, privilegeLevel };
    }
  );
}, "all-tags");

const getPosts = query(async (page: number = 1) => {
  "use server";
  const { ConnectionFactory, getPrivilegeLevel } =
    await import("~/server/utils");
  const { withCache } = await import("~/server/cache");
  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);

  return withCache(
    `posts-${privilegeLevel}-page-${page}`,
    CACHE_CONFIG.BLOG_POSTS_LIST_CACHE_TTL_MS,
    async () => {
      const conn = ConnectionFactory();
      const offset = (page - 1) * POSTS_PER_PAGE;

      // Get total count first
      let countQuery = `SELECT COUNT(*) as total FROM Post p`;
      if (privilegeLevel !== "admin") {
        countQuery += ` WHERE p.published = TRUE`;
      }
      const countResult = await conn.execute(countQuery);
      const totalPosts = (countResult.rows[0] as any).total;

      let postsQuery = `
      SELECT 
        p.id,
        p.title,
        p.subtitle,
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

      postsQuery += ` GROUP BY p.id, p.title, p.subtitle, p.banner_photo, p.date, p.published, p.category, p.author_id, p.reads, p.attachments`;
      postsQuery += ` ORDER BY p.date ASC`;
      postsQuery += ` LIMIT ${POSTS_PER_PAGE} OFFSET ${offset};`;

      const postsResult = await conn.execute(postsQuery);
      const posts = postsResult.rows;

      // Only fetch tags for the posts we're returning
      const postIds = posts.map((p: any) => p.id).join(",");
      const tagsQuery = postIds
        ? `
      SELECT t.value, t.post_id
      FROM Tag t
      WHERE t.post_id IN (${postIds})
      ORDER BY t.value ASC
    `
        : `SELECT t.value, t.post_id FROM Tag t WHERE 1=0`;

      const tagsResult = await conn.execute(tagsQuery);
      const tags = tagsResult.rows;

      return {
        posts,
        tags,
        hasMore: offset + posts.length < totalPosts,
        totalPosts
      };
    }
  );
}, "posts");

export default function BlogIndex() {
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = createSignal(1);
  const [allPosts, setAllPosts] = createSignal<any[]>([]);
  const [allTags, setAllTags] = createSignal<any[]>([]);
  const [hasMore, setHasMore] = createSignal(true);
  const [isLoading, setIsLoading] = createSignal(false);
  let sentinelRef: HTMLDivElement | undefined;

  const sort = () => {
    const sortParam = searchParams.sort;
    return Array.isArray(sortParam) ? sortParam[0] : sortParam || "newest";
  };
  const filters = () => {
    const filterParam = searchParams.filter;
    return filterParam
      ? Array.isArray(filterParam)
        ? filterParam[0]
        : filterParam
      : undefined;
  };
  const include = () => {
    const includeParam = searchParams.include;
    return includeParam
      ? Array.isArray(includeParam)
        ? includeParam[0]
        : includeParam
      : undefined;
  };
  const status = () => {
    const statusParam = searchParams.status;
    return statusParam
      ? Array.isArray(statusParam)
        ? statusParam[0]
        : statusParam
      : undefined;
  };

  // Load initial page and tag data
  const initialData = createAsync(() => getPosts(1), { deferStream: true });
  const tagsData = createAsync(() => getAllTags(), { deferStream: true });

  // Initialize with first page data
  const initializeData = () => {
    const firstPage = initialData();
    if (firstPage) {
      setAllPosts(firstPage.posts);
      setAllTags(firstPage.tags);
      setHasMore(firstPage.hasMore);
    }
  };

  // Load more posts
  const loadMorePosts = async () => {
    if (isLoading() || !hasMore()) return;

    setIsLoading(true);
    const nextPage = currentPage() + 1;

    try {
      const newData = await getPosts(nextPage);
      setAllPosts((prev) => [...prev, ...newData.posts]);
      setAllTags((prev) => [...prev, ...newData.tags]);
      setHasMore(newData.hasMore);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up IntersectionObserver for infinite scroll
  onMount(() => {
    initializeData();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMorePosts();
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef) {
      observer.observe(sentinelRef);
    }

    return () => observer.disconnect();
  });

  return (
    <>
      <Title>Blog | Michael Freno</Title>

      <div class="mx-auto py-16 pb-24">
        <Show when={initialData() && tagsData()} fallback={<TerminalSplash />}>
          <div class="flex flex-col items-center gap-4 px-4 md:flex-row md:justify-around">
            <PostSortingSelect />

            <Show
              when={tagsData() && Object.keys(tagsData()!.tagMap).length > 0}
            >
              <TagSelector tagMap={tagsData()!.tagMap} />
            </Show>

            <Show when={tagsData()?.privilegeLevel === "admin"}>
              <PublishStatusToggle />
            </Show>

            <Show when={tagsData()?.privilegeLevel === "admin"}>
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
            when={allPosts().length > 0}
            fallback={<div class="pt-12 text-center">No posts yet!</div>}
          >
            <div class="mx-auto flex w-11/12 flex-col pt-8">
              <PostSorting
                posts={allPosts()}
                tags={allTags()}
                privilegeLevel={tagsData()!.privilegeLevel}
                filters={filters()}
                sort={sort()}
                include={include()}
                status={status()}
              />

              {/* Sentinel element for infinite scroll */}
              <Show when={hasMore()}>
                <div ref={sentinelRef} class="py-8 text-center">
                  <Show when={isLoading()}>
                    <div class="text-lg">Loading more posts...</div>
                  </Show>
                </div>
              </Show>
            </div>
          </Show>
        </Show>
      </div>
    </>
  );
}
