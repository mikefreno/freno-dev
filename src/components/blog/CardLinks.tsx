import { createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Spinner } from "~/components/Spinner";

export interface CardLinksProps {
  postTitle: string;
  postID: number;
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
          readLoading() ? "bg-zinc-400" : "bg-lavender hover:brightness-125"
        } mx-auto mb-1 flex rounded px-4 py-2 text-base font-light shadow transition-all duration-300 ease-out active:scale-90`}
      >
        <Show when={readLoading()} fallback="Read">
          <Spinner size={24} />
        </Show>
      </A>
      <Show when={props.privilegeLevel === "admin"}>
        <A
          href={`/blog/edit/${props.postID}`}
          onClick={() => setEditLoading(true)}
          class={`${
            editLoading() ? "bg-zinc-400" : "bg-green-400 hover:bg-green-500"
          } mx-auto flex rounded px-4 py-2 text-base font-light shadow transition-all duration-300 ease-out active:scale-90`}
        >
          <Show when={editLoading()} fallback="Edit">
            <Spinner size={24} />
          </Show>
        </A>
      </Show>
    </div>
  );
}
