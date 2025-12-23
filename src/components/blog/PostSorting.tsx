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
  // Build set of tags that are ALLOWED
  const allowedTags = createMemo(() => {
    // WHITELIST MODE: If 'include' param is present, only show posts with those tags
    if (props.include) {
      const includeList = props.include.split("|").filter(Boolean);
      return new Set(includeList);
    }

    // BLACKLIST MODE: Filter out tags in 'filter' param
    const filterList = props.filters?.split("|").filter(Boolean) || [];

    // If no filters set, all tags are allowed
    if (filterList.length === 0) {
      return new Set(props.tags.map((t) => t.value.slice(1)));
    }

    // Build set of tags that are checked (allowed to show)
    const allTags = new Set(props.tags.map((t) => t.value.slice(1)));
    const filteredOutTags = new Set(filterList);

    const allowed = new Set<string>();
    allTags.forEach((tag) => {
      if (!filteredOutTags.has(tag)) {
        allowed.add(tag);
      }
    });

    return allowed;
  });

  // Get posts that have at least one allowed tag
  const filteredPosts = createMemo(() => {
    const allowed = allowedTags();

    // In whitelist mode, only show posts with allowed tags
    if (props.include) {
      // Build map of post_id -> tags for that post
      const postTags = new Map<number, Set<string>>();
      props.tags.forEach((tag) => {
        if (!postTags.has(tag.post_id)) {
          postTags.set(tag.post_id, new Set());
        }
        postTags.get(tag.post_id)!.add(tag.value.slice(1));
      });

      // Keep posts that have at least one allowed tag
      return props.posts.filter((post) => {
        const tags = postTags.get(post.id);
        if (!tags) return false; // Post has no tags

        // Check if post has at least one allowed tag
        for (const tag of tags) {
          if (allowed.has(tag)) {
            return true;
          }
        }
        return false;
      });
    }

    // In blacklist mode, show all posts if all tags are allowed
    if (
      allowed.size ===
      props.tags
        .map((t) => t.value.slice(1))
        .filter((v, i, a) => a.indexOf(v) === i).length
    ) {
      return props.posts;
    }

    // Build map of post_id -> tags for that post
    const postTags = new Map<number, Set<string>>();
    props.tags.forEach((tag) => {
      if (!postTags.has(tag.post_id)) {
        postTags.set(tag.post_id, new Set());
      }
      postTags.get(tag.post_id)!.add(tag.value.slice(1));
    });

    // Keep posts that have at least one allowed tag
    return props.posts.filter((post) => {
      const tags = postTags.get(post.id);
      if (!tags) return false; // Post has no tags

      // Check if post has at least one allowed tag
      for (const tag of tags) {
        if (allowed.has(tag)) {
          return true;
        }
      }
      return false;
    });
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
