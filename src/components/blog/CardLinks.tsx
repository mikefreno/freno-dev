import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import LoadingSpinner from "~/components/LoadingSpinner";

export interface CardLinksProps {
  postTitle: string;
  postID: number;
  linkTarget: string;
  privilegeLevel: string;
}

export default function CardLinks(props: CardLinksProps) {
  const [readLoading, setReadLoading] = createSignal(false);
  const [editLoading, setEditLoading] = createSignal(false);

  return (
    <div class="flex flex-col">
      <A
        href={`/blog/${props.postTitle}`}
        onClick={() => setReadLoading(true)}
        class={`${
          readLoading()
            ? "bg-zinc-400"
            : props.linkTarget === "project"
            ? "bg-blue-400 hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700"
            : "bg-orange-400 hover:bg-orange-500"
        } mb-1 ml-2 flex rounded px-4 py-2 font-light text-white shadow transition-all duration-300 ease-out active:scale-90`}
      >
        <Show when={readLoading()} fallback="Read">
          <LoadingSpinner height={24} width={24} />
        </Show>
      </A>
      <Show when={props.privilegeLevel === "admin"}>
        <A
          href={`/blog/edit/${props.postID}`}
          onClick={() => setEditLoading(true)}
          class={`${
            editLoading() ? "bg-zinc-400" : "bg-green-400 hover:bg-green-500"
          } ml-2 flex rounded px-4 py-2 font-light text-white shadow transition-all duration-300 ease-out active:scale-90`}
        >
          <Show when={editLoading()} fallback="Edit">
            <LoadingSpinner height={24} width={24} />
          </Show>
        </A>
      </Show>
    </div>
  );
}
