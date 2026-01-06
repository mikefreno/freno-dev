import { Show } from "solid-js";
import type { JSX } from "solid-js";
import IconButton from "./IconButton";
import XCircle from "~/components/icons/XCircle";

export interface AttachmentThumbnailProps {
  /** The URL of the file (either S3 URL or data URL) */
  fileUrl: string;
  /** Whether the file is a video */
  isVideo: boolean;
  /** Callback when the copy button is clicked */
  onCopy: () => void;
  /** Callback when the remove button is clicked */
  onRemove: () => void;
  /** Alt text for the image */
  alt?: string;
  /** Additional CSS classes */
  class?: string;
}

export default function AttachmentThumbnail(props: AttachmentThumbnailProps) {
  return (
    <div class={props.class}>
      <IconButton
        icon={
          <XCircle
            height={24}
            width={24}
            stroke={"currentColor"}
            strokeWidth={1}
          />
        }
        onClick={props.onRemove}
        aria-label={`Remove ${props.alt || "attachment"}`}
        variant="danger"
        class="hover:bg-crust hover:bg-opacity-80 absolute z-10 ml-4 pb-[120px]"
      />
      <button type="button" onClick={props.onCopy} class="relative">
        <Show
          when={props.isVideo}
          fallback={
            <img
              src={props.fileUrl}
              class="mx-4 my-auto h-36 w-36 object-cover"
              alt={props.alt || "attachment"}
            />
          }
        >
          <video
            src={props.fileUrl}
            class="mx-4 my-auto h-36 w-36 object-cover"
            controls
          />
        </Show>
      </button>
    </div>
  );
}

export { AttachmentThumbnail };
