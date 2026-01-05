import { For, Show, createMemo } from "solid-js";
import Card from "./Card";
import { PostCardData } from "~/db/types";

export interface Tag {
  value: string;
  post_id: number;
}

export interface PostSortingProps {
  posts: PostCardData[];
  tags: Tag[];
  privilegeLevel: "anonymous" | "admin" | "user";
  filters?: string;
  sort?: string;
  include?: string;
  status?: string;
}

export default function PostSorting(props: PostSortingProps) {
  // Memoize postTags map separately since tags don't change with filters/sorts
  const postTags = createMemo(() => {
    const tagMap = new Map<number, Set<string>>();
    props.tags.forEach((tag) => {
      if (!tagMap.has(tag.post_id)) {
        tagMap.set(tag.post_id, new Set());
      }
      const tagWithoutHash = tag.value.startsWith("#")
        ? tag.value.slice(1)
        : tag.value;
      tagMap.get(tag.post_id)!.add(tagWithoutHash);
    });
    return tagMap;
  });

  const filteredPosts = createMemo(() => {
    let filtered = props.posts;

    if (props.privilegeLevel === "admin" && props.status) {
      if (props.status === "published") {
        filtered = filtered.filter((post) => post.published === 1);
      } else if (props.status === "unpublished") {
        filtered = filtered.filter((post) => post.published === 0);
      }
    }

    const tags = postTags();

    if (props.include !== undefined) {
      const includeList = props.include.split("|").filter(Boolean);

      if (includeList.length === 0) {
        return [];
      }

      const includeSet = new Set(includeList);

      return filtered.filter((post) => {
        const postTagSet = tags.get(post.id);
        if (!postTagSet || postTagSet.size === 0) return false;

        for (const tag of postTagSet) {
          if (includeSet.has(tag)) {
            return true;
          }
        }
        return false;
      });
    }

    if (props.filters !== undefined) {
      const filterList = props.filters.split("|").filter(Boolean);

      if (filterList.length === 0) {
        return filtered;
      }

      const filterSet = new Set(filterList);

      return filtered.filter((post) => {
        const postTagSet = tags.get(post.id);
        if (!postTagSet || postTagSet.size === 0) return true;

        for (const tag of postTagSet) {
          if (filterSet.has(tag)) {
            return false;
          }
        }
        return true;
      });
    }

    return filtered;
  });

  const sortedPosts = createMemo(() => {
    let sorted = [...filteredPosts()];

    switch (props.sort) {
      case "newest":
        break; // Posts already come newest first from DB (DESC order)
      case "oldest":
        sorted.reverse(); // Reverse to get oldest first
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
        break; // Default to newest (already DESC from DB)
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
        {(post, index) => (
          <div class="my-4">
            <Card
              post={post}
              privilegeLevel={props.privilegeLevel}
              index={index()}
            />
          </div>
        )}
      </For>
    </Show>
  );
}
