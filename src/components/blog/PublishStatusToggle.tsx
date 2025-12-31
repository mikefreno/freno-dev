import { useSearchParams } from "@solidjs/router";

type PublishStatus = "all" | "published" | "unpublished";

export default function PublishStatusToggle() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentStatus = (): PublishStatus => {
    return (searchParams.status as PublishStatus) || "all";
  };

  const handleStatusChange = (status: PublishStatus) => {
    setSearchParams({ status });
  };

  const buttonClass = (status: PublishStatus) =>
    `px-4 py-2 transition-all duration-300 ${
      currentStatus() === status
        ? "bg-text text-base font-semibold"
        : "bg-transparent hover:brightness-125"
    }`;

  return (
    <div class="border-text mx-auto mt-2 flex overflow-hidden rounded border">
      <button
        onClick={() => handleStatusChange("all")}
        class={buttonClass("all")}
      >
        All
      </button>
      <button
        onClick={() => handleStatusChange("published")}
        class={`${buttonClass("published")} border-text border-r border-l`}
      >
        Published
      </button>
      <button
        onClick={() => handleStatusChange("unpublished")}
        class={buttonClass("unpublished")}
      >
        Unpublished
      </button>
    </div>
  );
}
