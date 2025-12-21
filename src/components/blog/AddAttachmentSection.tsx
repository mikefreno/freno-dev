import { createSignal, createEffect, For, Show } from "solid-js";
import Dropzone from "./Dropzone";
import XCircle from "~/components/icons/XCircle";
import AddImageToS3 from "~/lib/s3upload";
import { env } from "~/env/client";

export interface AddAttachmentSectionProps {
  type: "blog" | "project";
  postId?: number;
  postTitle: string;
  existingAttachments?: string;
}

export default function AddAttachmentSection(props: AddAttachmentSectionProps) {
  const [images, setImages] = createSignal<File[]>([]);
  const [imageHolder, setImageHolder] = createSignal<string[]>([]);
  const [newImageHolder, setNewImageHolder] = createSignal<string[]>([]);
  const [newImageHolderKeys, setNewImageHolderKeys] = createSignal<string[]>(
    []
  );

  createEffect(() => {
    if (props.existingAttachments) {
      const imgStringArr = props.existingAttachments.split(",");
      setImageHolder(imgStringArr);
    }
  });

  const handleImageDrop = async (acceptedFiles: File[]) => {
    if (props.postTitle) {
      for (const file of acceptedFiles) {
        setImages((prev) => [...prev, file]);

        try {
          const key = await AddImageToS3(file, props.postTitle, props.type);
          if (key) {
            setNewImageHolderKeys((prev) => [...prev, key]);

            const reader = new FileReader();
            reader.onload = () => {
              const str = reader.result;
              if (str) {
                setNewImageHolder((prev) => [...prev, str as string]);
              }
            };
            reader.readAsDataURL(file);
          }
        } catch (err) {
          console.error("Failed to upload image:", err);
        }
      }
    }
  };

  const removeImage = async (index: number, key: string) => {
    if (props.postId && props.existingAttachments) {
      const imgStringArr = props.existingAttachments.split(",");
      const newString = imgStringArr.filter((str) => str !== key).join(",");

      try {
        await fetch("/api/trpc/misc.deleteImage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            newAttachmentString: newString,
            type: props.type,
            id: props.postId
          })
        });

        setImageHolder((prev) => prev.filter((_, i) => i !== index));
      } catch (err) {
        console.error("Failed to delete image:", err);
      }
    }
  };

  const removeNewImage = async (index: number, key: string) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setNewImageHolder((prev) => prev.filter((_, i) => i !== index));

    try {
      await fetch("/api/trpc/misc.simpleDeleteImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });
    } catch (err) {
      console.error("Failed to delete image:", err);
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
          accept="image/jpg, image/jpeg, image/png"
          fileHolder={null}
          preSet={null}
        />
      </div>
      <div class="-mx-24 grid grid-cols-6 gap-4">
        <For each={imageHolder()}>
          {(key, index) => (
            <div>
              <button
                type="button"
                class="hover:bg-crust hover:bg-opacity-80 absolute ml-4 pb-[120px]"
                onClick={() => removeImage(index(), key)}
              >
                <XCircle
                  height={24}
                  width={24}
                  stroke={"currentColor"}
                  strokeWidth={1}
                />
              </button>
              <img src={key} class="mx-4 my-auto h-36 w-36" alt="attachment" />
            </div>
          )}
        </For>
        <div class="border-surface2 mx-auto border-r" />
        <For each={newImageHolder()}>
          {(img, index) => (
            <div>
              <button
                type="button"
                class="hover:bg-crust hover:bg-opacity-80 absolute ml-4 pb-[120px]"
                onClick={() =>
                  removeNewImage(index(), newImageHolderKeys()[index()])
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
                  copyToClipboard(newImageHolderKeys()[index()] as string)
                }
              >
                <img
                  src={img}
                  class="mx-4 my-auto h-36 w-36"
                  alt="new attachment"
                />
              </button>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
