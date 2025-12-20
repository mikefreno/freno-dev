import { For, Show } from "solid-js";
import Card, { Post } from "./Card";

export interface PostSortingProps {
  posts: Post[];
  privilegeLevel: "anonymous" | "admin" | "user";
}

/**
 * PostSorting Component
 *
 * Note: This component has been simplified - filtering and sorting
 * are now handled server-side via the blog.getPosts tRPC query.
 *
 * This component now only renders the posts that have already been
 * filtered and sorted by the server.
 */
export default function PostSorting(props: PostSortingProps) {
  return (
    <Show
      when={props.posts.length > 0}
      fallback={
        <div class="pt-12 text-center text-2xl tracking-wide italic">
          No posts found!
        </div>
      }
    >
      <For each={props.posts}>
        {(post) => (
          <div class="my-4">
            <Card post={post} privilegeLevel={props.privilegeLevel} />
          </div>
        )}
      </For>
    </Show>
  );
}
