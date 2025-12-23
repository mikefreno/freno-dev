import { For, Show, createMemo } from "solid-js";
import Card, { Post } from "./Card";

export interface Tag {
  value: string;
  post_id: number;
}

export interface PostSortingProps {
  posts: Post[];
  tags: Tag[];
  privilegeLevel: "anonymous" | "admin" | "user";
  filters?: string;
  sort?: string;
  include?: string;
}

export default function PostSorting(props: PostSortingProps) {
  const filteredPosts = createMemo(() => {
    // Build map of post_id -> tags for that post
    const postTags = new Map<number, Set<string>>();
    props.tags.forEach((tag) => {
      if (!postTags.has(tag.post_id)) {
        postTags.set(tag.post_id, new Set());
      }
      // Tag values in DB have # prefix, remove it for comparison
      const tagWithoutHash = tag.value.startsWith("#")
        ? tag.value.slice(1)
        : tag.value;
      postTags.get(tag.post_id)!.add(tagWithoutHash);
    });

    // WHITELIST MODE: Only show posts that have at least one of the included tags
    if (props.include !== undefined) {
      const includeList = props.include.split("|").filter(Boolean);

      // Empty whitelist means show nothing
      if (includeList.length === 0) {
        return [];
      }

      const includeSet = new Set(includeList);

      return props.posts.filter((post) => {
        const tags = postTags.get(post.id);
        if (!tags || tags.size === 0) return false;

        // Post must have at least one tag from the include list
        for (const tag of tags) {
          if (includeSet.has(tag)) {
            return true;
          }
        }
        return false;
      });
    }

    // BLACKLIST MODE: Hide posts that have ANY of the filtered tags
    if (props.filters !== undefined) {
      const filterList = props.filters.split("|").filter(Boolean);

      // Empty blacklist means show everything
      if (filterList.length === 0) {
        return props.posts;
      }

      const filterSet = new Set(filterList);

      return props.posts.filter((post) => {
        const tags = postTags.get(post.id);
        if (!tags || tags.size === 0) return true; // Show posts with no tags

        // Post must NOT have any blacklisted tags
        for (const tag of tags) {
          if (filterSet.has(tag)) {
            return false; // Hide this post
          }
        }
        return true; // Show this post
      });
    }

    // No filters: show all posts
    return props.posts;
  });

  const sortedPosts = createMemo(() => {
    let sorted = [...filteredPosts()];

    switch (props.sort) {
      case "newest":
        sorted.reverse(); // Posts come oldest first from DB
        break;
      case "oldest":
        // Already in oldest order from DB
        break;
      case "most_liked":
        sorted.sort((a, b) => (b.total_likes || 0) - (a.total_likes || 0));
        break;
      case "most_read":
        sorted.sort((a, b) => (b.reads || 0) - (a.reads || 0));
        break;
      case "most_comments":
        sorted.sort(
          (a, b) => (b.total_comments || 0) - (a.total_comments || 0)
        );
        break;
      default:
        sorted.reverse(); // Default to newest
    }

    return sorted;
  });

  return (
    <Show
      when={sortedPosts().length > 0}
      fallback={
        <Show
          when={props.posts.length > 0}
          fallback={
            <div class="pt-12 text-center text-2xl tracking-wide italic">
              No posts found!
            </div>
          }
        >
          <div class="pt-12 text-center text-2xl tracking-wide italic">
            All posts filtered out!
          </div>
        </Show>
      }
    >
      <For each={sortedPosts()}>
        {(post) => (
          <div class="my-4">
            <Card post={post} privilegeLevel={props.privilegeLevel} />
          </div>
        )}
      </For>
    </Show>
  );
}
