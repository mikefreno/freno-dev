import { Component, For, createMemo, Show } from "solid-js";
import { SkeletonBox } from "./SkeletonLoader";

interface ContributionDay {
  date: string;
  count: number;
}

export const ActivityHeatmap: Component<{
  contributions: ContributionDay[] | undefined;
  title: string;
}> = (props) => {
  // Generate last 12 weeks of days
  const weeks = createMemo(() => {
    const today = new Date();
    const weeksData: { date: string; count: number }[][] = [];

    // Start from 12 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 84); // 12 weeks

    // Create a map for quick lookup
    const contributionMap = new Map<string, number>();
    props.contributions?.forEach((c) => {
      contributionMap.set(c.date, c.count);
    });

    // Generate weeks
    for (let week = 0; week < 12; week++) {
      const weekData: { date: string; count: number }[] = [];

      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7 + day);

        const dateStr = date.toISOString().split("T")[0];
        const count = contributionMap.get(dateStr) || 0;

        weekData.push({ date: dateStr, count });
      }

      weeksData.push(weekData);
    }

    return weeksData;
  });

  const getColor = (count: number) => {
    if (count === 0) return "var(--color-surface0)";
    if (count <= 2) return "var(--color-green)";
    if (count <= 5) return "var(--color-teal)";
    if (count <= 10) return "var(--color-blue)";
    return "var(--color-mauve)";
  };

  const getOpacity = (count: number) => {
    if (count === 0) return 0.3;
    if (count <= 2) return 0.4;
    if (count <= 5) return 0.6;
    if (count <= 10) return 0.8;
    return 1;
  };

  return (
    <div class="flex flex-col gap-3">
      <h3 class="text-subtext0 text-sm font-semibold">{props.title}</h3>
      <Show
        when={props.contributions && props.contributions.length > 0}
        fallback={
          <div class="relative">
            {/* Skeleton grid matching heatmap dimensions */}
            <div class="flex gap-[2px]">
              <For each={Array(12)}>
                {() => (
                  <div class="flex flex-col gap-[2px]">
                    <For each={Array(7)}>
                      {() => <SkeletonBox class="h-2 w-2 rounded-[2px]" />}
                    </For>
                  </div>
                )}
              </For>
            </div>
            {/* Centered spinner overlay */}
            <div class="bg-base/70 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
              <SkeletonBox class="h-8 w-8" />
            </div>
          </div>
        }
      >
        <div class="flex gap-[2px] overflow-x-auto">
          <For each={weeks()}>
            {(week) => (
              <div class="flex flex-col gap-[2px]">
                <For each={week}>
                  {(day) => (
                    <div
                      class="h-2 w-2 rounded-[2px] transition-all hover:scale-125"
                      style={{
                        "background-color": getColor(day.count),
                        opacity: getOpacity(day.count)
                      }}
                      title={`${day.date}: ${day.count} contributions`}
                    />
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class="flex items-center gap-2 text-[10px]">
        <span class="text-subtext1">Less</span>
        <div class="flex gap-1">
          <For each={[0, 2, 5, 10, 15]}>
            {(count) => (
              <div
                class="h-2 w-2 rounded-[2px]"
                style={{
                  "background-color": getColor(count),
                  opacity: getOpacity(count)
                }}
              />
            )}
          </For>
        </div>
        <span class="text-subtext1">More</span>
      </div>
    </div>
  );
};
