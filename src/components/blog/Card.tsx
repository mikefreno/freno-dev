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
    <div class="bg-base relative z-0 mx-auto h-96 w-full overflow-hidden rounded-lg shadow-lg md:w-5/6 lg:w-3/4 dark:bg-zinc-900">
      <Show when={props.privilegeLevel === "admin"}>
        <div class="border-opacity-20 bg-opacity-40 dark:bg-opacity-60 absolute top-0 w-full border-b border-white bg-white px-2 py-4 backdrop-blur-md md:px-6 dark:border-black dark:bg-zinc-800">
          <div class="flex justify-between">
            <Show when={!props.post.published}>
              <div class="text-center text-lg whitespace-nowrap text-black dark:text-white">
                Not Published
              </div>
            </Show>
            <DeletePostButton type="Blog" postID={props.post.id} />
          </div>
        </div>
      </Show>
      <img
        src={props.post.banner_photo ? props.post.banner_photo : "/bitcoin.jpg"}
        alt={props.post.title.replaceAll("_", " ") + " banner"}
        class="h-full w-full object-cover"
      />
      <div class="border-opacity-20 bg-opacity-40 dark:bg-opacity-60 bg-base absolute bottom-0 w-full border-t border-white px-2 py-4 backdrop-blur-md md:px-6 dark:border-zinc-900 dark:bg-zinc-800">
        <div class="flex flex-col items-center justify-between md:flex-row">
          <div class="text-center md:text-left">
            <div class="text-lg text-black md:text-xl dark:text-white">
              {props.post.subtitle}
            </div>
            <div class="text-2xl text-black md:text-3xl dark:text-white">
              {props.post.title.replaceAll("_", " ")}
            </div>
          </div>
          <div class="flex w-full justify-around pt-2 md:w-1/3 md:justify-between md:pt-0 md:pl-2">
            <div class="my-auto md:h-full">
              <p class="text-sm whitespace-nowrap text-black dark:text-white">
                {props.post.total_comments || 0} Comments
              </p>
              <p class="text-sm whitespace-nowrap text-black dark:text-white">
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
