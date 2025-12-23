import { Component, For, Show } from "solid-js";
import { Typewriter } from "./Typewriter";
import { SkeletonText, SkeletonBox } from "./SkeletonLoader";

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  repo: string;
  url: string;
}

export const RecentCommits: Component<{
  commits: Commit[] | undefined;
  title: string;
  loading?: boolean;
}> = (props) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });
    }
  };

  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-subtext0 text-sm font-semibold">{props.title}</h3>
      <Show
        when={!props.loading && props.commits && props.commits.length > 0}
        fallback={
          <Show
            when={props.loading}
            fallback={
              <div class="text-subtext1 text-xs">No recent commits</div>
            }
          >
            <div class="flex flex-col gap-2">
              <For each={[1, 2, 3]}>
                {() => (
                  <div class="block w-52 rounded-md p-2">
                    <div class="flex min-w-0 flex-col gap-1">
                      <SkeletonText class="h-3 w-full" />
                      <SkeletonText class="h-3 w-3/4" />
                      <SkeletonText class="my-1 h-2 w-10" />
                      <div class="flex min-w-0 items-center gap-2 overflow-hidden">
                        <SkeletonBox class="h-5 w-16" />
                        <SkeletonText class="h-2 w-24" />
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        }
      >
        <div class="flex flex-col gap-2">
          <For each={props.commits}>
            {(commit) => (
              <a
                href={commit.url}
                target="_blank"
                rel="noreferrer"
                class="hover:bg-surface0 group block w-52 rounded-md p-2 transition-all duration-200 ease-in-out hover:scale-[1.02]"
              >
                <Typewriter
                  speed={100}
                  keepAlive={false}
                  class="flex min-w-0 flex-col gap-1"
                >
                  <div class="flex min-w-0 items-start justify-between gap-2">
                    <span class="text-text line-clamp-2 min-w-0 flex-1 text-xs leading-tight font-medium wrap-break-word">
                      {commit.message}
                    </span>
                  </div>
                  <span class="text-subtext1 shrink-0 text-[10px]">
                    {formatDate(commit.date)}
                  </span>
                  <div class="flex min-w-0 items-center gap-2 overflow-hidden">
                    <span class="bg-surface1 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
                      {commit.sha}
                    </span>
                    <span class="text-subtext0 min-w-0 truncate text-[10px]">
                      {commit.repo}
                    </span>
                  </div>
                </Typewriter>
              </a>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
