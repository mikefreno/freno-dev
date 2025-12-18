import { Show, Suspense } from "solid-js";
import { useSearchParams, A } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { api } from "~/lib/api";
import PostSortingSelect from "~/components/blog/PostSortingSelect";
import TagSelector from "~/components/blog/TagSelector";
import PostSorting from "~/components/blog/PostSorting";

export default function BlogIndex() {
  const [searchParams] = useSearchParams();

  const sort = () => searchParams.sort || "newest";
  const filters = () => searchParams.filter || "";

  const data = createAsync(() => api.blog.getPosts.query());

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
