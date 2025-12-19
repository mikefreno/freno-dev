import { Show } from "solid-js";

export interface DropzoneProps {
  onDrop: (files: File[]) => void;
  accept?: string;
  fileHolder?: string | ArrayBuffer | null;
  preSet?: string | null;
}

export default function Dropzone(props: DropzoneProps) {
  let inputRef: HTMLInputElement | undefined;

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      props.onDrop(Array.from(files));
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      props.onDrop(Array.from(files));
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      class="border-surface2 z-10 my-4 flex border border-dashed bg-transparent shadow-xl"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef?.click()}
    >
      <label
        for="upload"
        class="flex h-48 w-48 cursor-pointer items-center justify-center"
      >
        <input
          ref={inputRef}
          type="file"
          class="hidden"
          accept={props.accept || "image/jpg, image/jpeg, image/png"}
          onChange={handleFileChange}
          multiple
        />
        <Show
          when={props.fileHolder !== null || props.preSet !== null}
          fallback={
            <>
              <div class="flex flex-col items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="stroke-text h-8 w-8 fill-transparent"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span id="drop" class="text-md text-subtext0">
                  Upload Image
                  <br />
                  <span class="text-sm">Click or drag</span>
                </span>
              </div>
            </>
          }
        >
          <div>
            <Show
              when={!props.fileHolder && props.preSet === "userDefault"}
              fallback={
                <img
                  src={(props.fileHolder || props.preSet) as string}
                  class="h-36 w-36 rounded-full object-cover object-center"
                  alt="upload"
                />
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width={1.5}
                stroke="currentColor"
                class="mx-auto h-12 w-12"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
              <span id="drop" class="text-md text-subtext0">
                Upload Image
                <br />
                <span class="text-sm">Click or drag</span>
              </span>
            </Show>
          </div>
        </Show>
      </label>
    </div>
  );
}
