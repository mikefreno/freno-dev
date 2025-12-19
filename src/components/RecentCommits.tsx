import { Component, For, Show } from "solid-js";

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
          <div class="text-subtext1 text-xs">
            {props.loading ? "Loading..." : "No recent commits"}
          </div>
        }
      >
        <div class="flex flex-col gap-2">
          <For each={props.commits}>
            {(commit) => (
              <a
                href={commit.url}
                target="_blank"
                rel="noreferrer"
                class="hover:bg-surface0 group rounded-md p-2 transition-all duration-200 ease-in-out hover:scale-[1.02]"
              >
                <div class="flex flex-col gap-1">
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-text line-clamp-2 flex-1 text-xs leading-tight font-medium">
                      {commit.message}
                    </span>
                    <span class="text-subtext1 shrink-0 text-[10px]">
                      {formatDate(commit.date)}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="bg-surface1 rounded px-1.5 py-0.5 font-mono text-[10px]">
                      {commit.sha}
                    </span>
                    <span class="text-subtext0 truncate text-[10px]">
                      {commit.repo}
                    </span>
                  </div>
                </div>
              </a>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
