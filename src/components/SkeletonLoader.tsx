import { Spinner } from "~/components/Spinner";

interface SkeletonProps {
  class?: string;
}

export function SkeletonBox(props: SkeletonProps) {
  return (
    <div
      class={`bg-surface0 flex items-center justify-center rounded ${props.class || ""}`}
      aria-label="Loading..."
      role="status"
    >
      <Spinner size="md" />
    </div>
  );
}

export function SkeletonText(props: SkeletonProps) {
  return (
    <div
      class={`bg-surface0 inline-flex items-center rounded px-2 ${props.class || ""}`}
      aria-label="Loading..."
      role="status"
    >
      <Spinner size="sm" />
    </div>
  );
}

export function SkeletonCircle(props: SkeletonProps) {
  return (
    <div
      class={`bg-surface0 flex items-center justify-center rounded-full ${props.class || ""}`}
      aria-label="Loading..."
      role="status"
    >
      <Spinner size="md" />
    </div>
  );
}
