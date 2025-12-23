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
    <div class="bg-base border-text relative z-0 mx-auto h-96 w-full overflow-hidden rounded-lg border shadow-lg lg:w-5/6 xl:w-3/4">
      <Show when={props.privilegeLevel === "admin"}>
        <div class="border-opacity-20 bg-opacity-40 border-text bg-text absolute top-0 w-full border-b px-2 py-4 backdrop-blur-md md:px-6">
          <div class="flex justify-between">
            <Show when={!props.post.published}>
              <div class="text-center text-base text-lg whitespace-nowrap">
                Not Published
              </div>
            </Show>
            <DeletePostButton type="Blog" postID={props.post.id} />
          </div>
        </div>
      </Show>
      <img
        src={props.post.banner_photo ?? ""}
        alt={props.post.title.replaceAll("_", " ") + " banner"}
        class="h-full w-full object-cover"
      />
      <div class="border-opacity-20 bg-opacity-40 bg-base border-text absolute bottom-0 w-full border-t px-2 py-4 backdrop-blur-md md:px-6">
        <div class="flex flex-col items-center justify-between md:flex-row">
          <div class="text-center lg:text-left">
            <div class="text-2xl md:text-3xl">
              {props.post.title.replaceAll("_", " ")}
            </div>
            <div class="text-lg md:text-xl">{props.post.subtitle}</div>
          </div>
          <div class="flex w-full flex-col justify-around pt-2 lg:w-1/2 lg:flex-row lg:justify-between lg:pt-0 lg:pl-2">
            <div class="m-auto md:h-full md:pr-2">
              <p class="text-sm whitespace-nowrap">
                {props.post.total_comments || 0} Comments
              </p>
              <p class="text-sm whitespace-nowrap">
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
