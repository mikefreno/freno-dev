import { For, Show } from "solid-js";
import Card, { Post } from "./Card";

export interface Tag {
  id: number;
  value: string;
  post_id: number;
}

export interface PostSortingProps {
  posts: Post[];
  tags: Tag[];
  privilegeLevel: "anonymous" | "admin" | "user";
  filters?: string;
  sort?: string;
}

export default function PostSorting(props: PostSortingProps) {
  const postsToFilter = () => {
    const filterSet = new Set<number>();
    props.tags.forEach((tag) => {
      if (props.filters?.split("|").includes(tag.value.slice(1))) {
        filterSet.add(tag.post_id);
      }
    });
    return filterSet;
  };

  const filteredPosts = () => {
    return props.posts.filter((post) => {
      return !postsToFilter().has(post.id);
    });
  };

  const sortedPosts = () => {
    const posts = filteredPosts();

    switch (props.sort) {
      case "newest":
        return [...posts];
      case "oldest":
        return [...posts].reverse();
      case "most liked":
        return [...posts].sort((a, b) => b.total_likes - a.total_likes);
      case "most read":
        return [...posts].sort((a, b) => b.reads - a.reads);
      case "most comments":
        return [...posts].sort((a, b) => b.total_comments - a.total_comments);
      default:
        return [...posts].reverse();
    }
  };

  return (
    <Show
      when={!(props.posts.length > 0 && filteredPosts().length === 0)}
      fallback={
        <div class="pt-12 text-center text-2xl tracking-wide italic">
          All posts filtered out!
        </div>
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
