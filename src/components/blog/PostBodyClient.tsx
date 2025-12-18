import { createEffect, onMount } from "solid-js";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

export interface PostBodyClientProps {
  body: string;
  hasCodeBlock: boolean;
}

export default function PostBodyClient(props: PostBodyClientProps) {
  let contentRef: HTMLDivElement | undefined;

  // Apply syntax highlighting when component mounts and when body changes
  createEffect(() => {
    if (props.hasCodeBlock && contentRef) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        hljs.highlightAll();
      }, 100);
    }
  });

  return (
    <div class="mx-auto max-w-4xl px-4 pt-32 md:pt-40">
      <div
        ref={contentRef}
        class="prose dark:prose-invert max-w-none"
        innerHTML={props.body}
      />
    </div>
  );
}
