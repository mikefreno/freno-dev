import { Show } from "solid-js";
import CardLinks from "./CardLinks";
import DeletePostButton from "./DeletePostButton";

export interface Post {
  id: number;
  title: string;
  subtitle: string | null;
  body: string | null;
  banner_photo: string | null;
  date: string;
  published: boolean;
  category: string;
  author_id: string;
  reads: number;
  attachments: string | null;
  total_likes: number;
  total_comments: number;
}

export interface CardProps {
  post: Post;
  privilegeLevel: "anonymous" | "admin" | "user";
}

export default function Card(props: CardProps) {
  return (
    <div class="relative z-0 mx-auto h-96 w-full overflow-hidden rounded-lg bg-white shadow-lg dark:bg-zinc-900 md:w-5/6 lg:w-3/4">
      <Show when={props.privilegeLevel === "admin"}>
        <div class="absolute top-0 w-full border-b border-white border-opacity-20 bg-white bg-opacity-40 px-2 py-4 backdrop-blur-md dark:border-black dark:bg-zinc-800 dark:bg-opacity-60 md:px-6">
          <div class="flex justify-between">
            <Show when={!props.post.published}>
              <div class="whitespace-nowrap text-center text-lg text-black dark:text-white">
                Not Published
              </div>
            </Show>
            <DeletePostButton
              type="Blog"
              postID={props.post.id}
            />
          </div>
        </div>
      </Show>
      <img
        src={
          props.post.banner_photo
            ? props.post.banner_photo
            : "/bitcoin.jpg"
        }
        alt={props.post.title.replaceAll("_", " ") + " banner"}
        class="h-full w-full object-cover"
      />
      <div class="absolute bottom-0 w-full border-t border-white border-opacity-20 bg-white bg-opacity-40 px-2 py-4 backdrop-blur-md dark:border-zinc-900 dark:bg-zinc-800 dark:bg-opacity-60 md:px-6">
        <div class="flex flex-col items-center justify-between md:flex-row">
          <div class="text-center md:text-left">
            <div class="text-lg text-black dark:text-white md:text-xl">
              {props.post.subtitle}
            </div>
            <div class="text-2xl text-black dark:text-white md:text-3xl">
              {props.post.title.replaceAll("_", " ")}
            </div>
          </div>
          <div class="flex w-full justify-around pt-2 md:w-1/3 md:justify-between md:pl-2 md:pt-0">
            <div class="my-auto md:h-full">
              <p class="whitespace-nowrap text-sm text-black dark:text-white">
                {props.post.total_comments || 0} Comments
              </p>
              <p class="whitespace-nowrap text-sm text-black dark:text-white">
                {props.post.total_likes || 0} Likes
              </p>
            </div>
            <CardLinks
              postTitle={props.post.title}
              privilegeLevel={props.privilegeLevel}
              postID={props.post.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
