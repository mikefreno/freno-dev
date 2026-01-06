import { createSignal, createEffect, For, Show } from "solid-js";
import Dropzone from "./Dropzone";
import AttachmentThumbnail from "~/components/ui/AttachmentThumbnail";
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
            <AttachmentThumbnail
              fileUrl={getFileUrl(file.key)}
              isVideo={isVideoFile(file.key)}
              onCopy={() => copyToClipboard(file.key)}
              onRemove={() => removeImage(file.key)}
              alt="attachment"
            />
          )}
        </For>
        <Show when={newFileHolder().length > 0}>
          <div class="border-surface2 mx-auto border-r" />
        </Show>
        <For each={newFileHolder()}>
          {(file, index) => (
            <AttachmentThumbnail
              fileUrl={file}
              isVideo={fileTypes()[index()]?.startsWith("video/") || false}
              onCopy={() =>
                copyToClipboard(newFileHolderKeys()[index()] as string)
              }
              onRemove={() =>
                removeNewImage(index(), newFileHolderKeys()[index()])
              }
              alt="new attachment"
            />
          )}
        </For>
      </div>
    </Show>
  );
}
