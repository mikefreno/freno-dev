import { createSignal, createEffect, For, Show } from "solid-js";
import Dropzone from "./Dropzone";
import XCircle from "~/components/icons/XCircle";
import AddImageToS3 from "~/lib/s3upload";
import { env } from "~/env/client";
import { api } from "~/lib/api";

export interface AddAttachmentSectionProps {
  type: "blog" | "project";
  postId?: number;
  postTitle: string;
  existingAttachments?: string;
}

export default function AddAttachmentSection(props: AddAttachmentSectionProps) {
  const [files, setFiles] = createSignal<File[]>([]);
  const [s3Files, setS3Files] = createSignal<
    Array<{ key: string; size: number; lastModified: string }>
  >([]);
  const [newFileHolder, setNewFileHolder] = createSignal<string[]>([]);
  const [newFileHolderKeys, setNewFileHolderKeys] = createSignal<string[]>([]);
  const [fileTypes, setFileTypes] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);

  createEffect(() => {
    if (props.postTitle) {
      loadAttachments();
    }
  });

  const loadAttachments = async () => {
    setLoading(true);
    try {
      const result = await api.misc.listAttachments.query({
        type: props.type,
        title: props.postTitle
      });
      setS3Files(result.files);
    } catch (err) {
      console.error("Failed to load attachments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageDrop = async (acceptedFiles: File[]) => {
    if (props.postTitle) {
      for (const file of acceptedFiles) {
        setFiles((prev) => [...prev, file]);

        try {
          const key = await AddImageToS3(file, props.postTitle, props.type);
          if (key) {
            setNewFileHolderKeys((prev) => [...prev, key]);

            const reader = new FileReader();
            reader.onload = () => {
              const str = reader.result;
              if (str) {
                setNewFileHolder((prev) => [...prev, str as string]);
                setFileTypes((prev) => [...prev, file.type]);
              }
            };
            reader.readAsDataURL(file);

            // Refresh the S3 file list
            await loadAttachments();
          }
        } catch (err) {
          console.error("Failed to upload file:", err);
        }
      }
    }
  };

  const removeImage = async (key: string) => {
    try {
      await fetch("/api/trpc/misc.simpleDeleteImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      // Refresh the S3 file list
      await loadAttachments();
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const removeNewImage = async (index: number, key: string) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFileHolder((prev) => prev.filter((_, i) => i !== index));
    setFileTypes((prev) => prev.filter((_, i) => i !== index));

    try {
      await fetch("/api/trpc/misc.simpleDeleteImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const copyToClipboard = async (key: string) => {
    try {
      const bucketString = env.VITE_AWS_BUCKET_STRING || "";
      await navigator.clipboard.writeText(bucketString + key);
      console.log("Text copied to clipboard");
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const getFileUrl = (key: string) => {
    const bucketString = env.VITE_AWS_BUCKET_STRING || "";
    return bucketString + key;
  };

  const isVideoFile = (url: string) => {
    return url.match(/\.(mp4|webm|mov)$/i) !== null;
  };

  return (
    <Show
      when={props.postTitle}
      fallback={
        <div class="text-subtext0 pb-4 text-center italic">
          Add title to add attachments
        </div>
      }
    >
      <div class="text-center text-xl">Attachments</div>
      <div class="flex justify-center">
        <Dropzone
          onDrop={handleImageDrop}
          accept="image/jpg, image/jpeg, image/png, video/mp4, video/webm, video/quicktime"
          fileHolder={null}
          preSet={null}
        />
      </div>
      <Show when={loading()}>
        <div class="text-subtext0 py-4 text-center">Loading attachments...</div>
      </Show>
      <div class="-mx-24 grid grid-cols-6 gap-4">
        <For each={s3Files()}>
          {(file) => (
            <div>
              <button
                type="button"
                class="hover:bg-crust hover:bg-opacity-80 absolute z-10 ml-4 pb-[120px]"
                onClick={() => removeImage(file.key)}
              >
                <XCircle
                  height={24}
                  width={24}
                  stroke={"currentColor"}
                  strokeWidth={1}
                />
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(file.key)}
                class="relative"
              >
                <Show
                  when={isVideoFile(file.key)}
                  fallback={
                    <img
                      src={getFileUrl(file.key)}
                      class="mx-4 my-auto h-36 w-36 object-cover"
                      alt="attachment"
                    />
                  }
                >
                  <video
                    src={getFileUrl(file.key)}
                    class="mx-4 my-auto h-36 w-36 object-cover"
                    controls
                  />
                </Show>
              </button>
            </div>
          )}
        </For>
        <Show when={newFileHolder().length > 0}>
          <div class="border-surface2 mx-auto border-r" />
        </Show>
        <For each={newFileHolder()}>
          {(file, index) => (
            <div>
              <button
                type="button"
                class="hover:bg-crust hover:bg-opacity-80 absolute z-10 ml-4 pb-[120px]"
                onClick={() =>
                  removeNewImage(index(), newFileHolderKeys()[index()])
                }
              >
                <XCircle
                  height={24}
                  width={24}
                  stroke={"currentColor"}
                  strokeWidth={1}
                />
              </button>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(newFileHolderKeys()[index()] as string)
                }
              >
                <Show
                  when={fileTypes()[index()]?.startsWith("video/")}
                  fallback={
                    <img
                      src={file}
                      class="mx-4 my-auto h-36 w-36 object-cover"
                      alt="new attachment"
                    />
                  }
                >
                  <video
                    src={file}
                    class="mx-4 my-auto h-36 w-36 object-cover"
                    controls
                  />
                </Show>
              </button>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
