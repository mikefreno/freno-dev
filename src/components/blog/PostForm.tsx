import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { api } from "~/lib/api";
import { debounce } from "es-toolkit";
import Dropzone from "~/components/blog/Dropzone";
import TextEditor from "~/components/blog/TextEditor";
import TagMaker from "~/components/blog/TagMaker";
import AddAttachmentSection from "~/components/blog/AddAttachmentSection";
import XCircle from "~/components/icons/XCircle";
import AddImageToS3 from "~/lib/s3upload";

interface PostFormProps {
  mode: "create" | "edit";
  postId?: number;
  initialData?: {
    title: string;
    subtitle: string;
    body: string;
    banner_photo: string;
    published: boolean;
    tags: string[];
  };
  userID: number;
}

export default function PostForm(props: PostFormProps) {
  const navigate = useNavigate();

  const [title, setTitle] = createSignal(props.initialData?.title || "");
  const [subtitle, setSubtitle] = createSignal(
    props.initialData?.subtitle || ""
  );
  const [body, setBody] = createSignal(props.initialData?.body || "");
  const [bannerPhoto, setBannerPhoto] = createSignal(
    props.initialData?.banner_photo || ""
  );
  const [bannerImageFile, setBannerImageFile] = createSignal<File>();
  const [bannerImageHolder, setBannerImageHolder] = createSignal<
    string | ArrayBuffer | null
  >(null);
  const [requestedDeleteImage, setRequestedDeleteImage] = createSignal(false);
  const [published, setPublished] = createSignal(
    props.initialData?.published || false
  );
  const [tags, setTags] = createSignal<string[]>(props.initialData?.tags || []);
  const [tagInputValue, setTagInputValue] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [showAutoSaveMessage, setShowAutoSaveMessage] = createSignal(false);
  const [isInitialLoad, setIsInitialLoad] = createSignal(props.mode === "edit");
  const [initialBody, setInitialBody] = createSignal<string | undefined>(
    props.initialData?.body
  );
  const [hasSaved, setHasSaved] = createSignal(props.mode === "edit");
  const [createdPostId, setCreatedPostId] = createSignal<number | undefined>(
    props.postId
  );

  // Mark initial load as complete after data is loaded (for edit mode)
  createEffect(() => {
    if (props.mode === "edit" && props.initialData) {
      setIsInitialLoad(false);
    }
  });

  const showAutoSaveTrigger = () => {
    setShowAutoSaveMessage(true);
    setTimeout(() => {
      setShowAutoSaveMessage(false);
    }, 5000);
  };

  // Helper to ensure post exists (create if needed)
  const ensurePostExists = async (): Promise<number> => {
    const existingId = createdPostId() || props.postId;
    if (existingId) return existingId;

    // Create minimal post if it doesn't exist yet
    const result = await api.database.createPost.mutate({
      category: "blog",
      title: title().replaceAll(" ", "_") || "Untitled",
      subtitle: null,
      body: "Hello, World!",
      banner_photo: null,
      published: false,
      tags: null,
      author_id: props.userID
    });
    const newId = result.data as number;
    setCreatedPostId(newId);
    setHasSaved(true);
    return newId;
  };

  // Individual autosave functions for each field
  const autoSaveTitle = async () => {
    const currentTitle = title();
    if (!currentTitle || currentTitle === props.initialData?.title) return;

    try {
      const postId = await ensurePostExists();
      await api.database.updatePost.mutate({
        id: postId,
        title: currentTitle.replaceAll(" ", "_"),
        subtitle: subtitle() || null,
        body: body() || "Hello, World!",
        banner_photo: null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: props.userID
      });
      showAutoSaveTrigger();
    } catch (err) {
      console.error("Title autosave failed:", err);
    }
  };

  const autoSaveSubtitle = async () => {
    const currentSubtitle = subtitle();
    if (currentSubtitle === props.initialData?.subtitle) return;
    if (!title()) return; // Need title to save

    try {
      const postId = await ensurePostExists();
      await api.database.updatePost.mutate({
        id: postId,
        title: title().replaceAll(" ", "_"),
        subtitle: currentSubtitle || null,
        body: body() || "Hello, World!",
        banner_photo: null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: props.userID
      });
      showAutoSaveTrigger();
    } catch (err) {
      console.error("Subtitle autosave failed:", err);
    }
  };

  const autoSaveBody = async () => {
    const currentBody = body();
    if (currentBody === props.initialData?.body) return;
    if (!title()) return;

    try {
      const postId = await ensurePostExists();
      await api.database.updatePost.mutate({
        id: postId,
        title: title().replaceAll(" ", "_"),
        subtitle: subtitle() || null,
        body: currentBody || "Hello, World!",
        banner_photo: null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: props.userID
      });
      showAutoSaveTrigger();
    } catch (err) {
      console.error("Body autosave failed:", err);
    }
  };

  const autoSaveTags = async () => {
    const currentTags = tags();
    const initialTags = props.initialData?.tags || [];
    if (JSON.stringify(currentTags) === JSON.stringify(initialTags)) return;
    if (!title()) return;

    try {
      const postId = await ensurePostExists();
      await api.database.updatePost.mutate({
        id: postId,
        title: title().replaceAll(" ", "_"),
        subtitle: subtitle() || null,
        body: body() || "Hello, World!",
        banner_photo: null,
        published: published(),
        tags: currentTags.length > 0 ? currentTags : null,
        author_id: props.userID
      });
      showAutoSaveTrigger();
    } catch (err) {
      console.error("Tags autosave failed:", err);
    }
  };

  const autoSavePublished = async () => {
    const currentPublished = published();
    if (currentPublished === props.initialData?.published) return;
    if (!title()) return;

    try {
      const postId = await ensurePostExists();
      await api.database.updatePost.mutate({
        id: postId,
        title: title().replaceAll(" ", "_"),
        subtitle: subtitle() || null,
        body: body() || "Hello, World!",
        banner_photo: null,
        published: currentPublished,
        tags: tags().length > 0 ? tags() : null,
        author_id: props.userID
      });
      showAutoSaveTrigger();
    } catch (err) {
      console.error("Published autosave failed:", err);
    }
  };

  const autoSaveBanner = async () => {
    const bannerFile = bannerImageFile();
    if (!bannerFile && !requestedDeleteImage()) return;
    if (!title()) return;

    try {
      let bannerImageKey = "";
      if (bannerFile) {
        bannerImageKey = (await AddImageToS3(
          bannerFile,
          title(),
          "blog"
        )) as string;
      }

      const postId = await ensurePostExists();
      await api.database.updatePost.mutate({
        id: postId,
        title: title().replaceAll(" ", "_"),
        subtitle: subtitle() || null,
        body: body() || "Hello, World!",
        banner_photo:
          bannerImageKey !== ""
            ? bannerImageKey
            : requestedDeleteImage()
              ? "_DELETE_IMAGE_"
              : null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: props.userID
      });
      showAutoSaveTrigger();
    } catch (err) {
      console.error("Banner autosave failed:", err);
    }
  };

  // Debounced versions
  const debouncedAutoSaveTitle = debounce(autoSaveTitle, 2500);
  const debouncedAutoSaveSubtitle = debounce(autoSaveSubtitle, 2500);
  const debouncedAutoSaveBody = debounce(autoSaveBody, 2500);
  const debouncedAutoSaveTags = debounce(autoSaveTags, 2500);
  const debouncedAutoSavePublished = debounce(autoSavePublished, 1000);
  const debouncedAutoSaveBanner = debounce(autoSaveBanner, 2500);

  // Individual effects for each field
  createEffect(() => {
    const titleVal = title();
    if (isInitialLoad()) return;
    if (titleVal && titleVal !== props.initialData?.title) {
      debouncedAutoSaveTitle();
    }
  });

  createEffect(() => {
    const subtitleVal = subtitle();
    if (isInitialLoad()) return;
    if (subtitleVal !== props.initialData?.subtitle) {
      debouncedAutoSaveSubtitle();
    }
  });

  createEffect(() => {
    const bodyVal = body();
    if (isInitialLoad()) return;
    if (bodyVal !== props.initialData?.body) {
      debouncedAutoSaveBody();
    }
  });

  createEffect(() => {
    const tagsVal = tags();
    if (isInitialLoad()) return;
    const initialTags = props.initialData?.tags || [];
    if (JSON.stringify(tagsVal) !== JSON.stringify(initialTags)) {
      debouncedAutoSaveTags();
    }
  });

  createEffect(() => {
    const publishedVal = published();
    if (isInitialLoad()) return;
    if (publishedVal !== props.initialData?.published) {
      debouncedAutoSavePublished();
    }
  });

  createEffect(() => {
    const bannerFile = bannerImageFile();
    const deleteRequested = requestedDeleteImage();
    if (isInitialLoad()) return;
    if (bannerFile || deleteRequested) {
      debouncedAutoSaveBanner();
    }
  });

  onCleanup(() => {
    debouncedAutoSaveTitle.cancel();
    debouncedAutoSaveSubtitle.cancel();
    debouncedAutoSaveBody.cancel();
    debouncedAutoSaveTags.cancel();
    debouncedAutoSavePublished.cancel();
    debouncedAutoSaveBanner.cancel();
  });

  const handleBannerImageDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (props.mode === "edit") {
        setRequestedDeleteImage(false);
      }
      setBannerImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setBannerImageHolder(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBannerImage = () => {
    setBannerImageFile(undefined);
    setBannerImageHolder(null);
    if (props.mode === "edit") {
      setRequestedDeleteImage(true);
    }
  };

  const tagHandler = (input: string) => {
    const split = input.split(" ");
    if (split.length > 1) {
      const newSplit: string[] = [];
      split.forEach((word) => {
        if (word[0] === "#" && word.length > 1) {
          setTags((prevTags) => [...prevTags, word]);
        } else {
          newSplit.push(word);
        }
      });
      setTagInputValue(newSplit.join(" "));
    } else {
      setTagInputValue(input);
    }
  };

  const deleteTag = (idx: number) => {
    setTags((prevTags) => prevTags.filter((_, index) => index !== idx));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!props.userID) {
      setError(`You must be logged in to ${props.mode} posts`);
      return;
    }

    if (!title()) {
      setError("Title is required to publish");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let bannerImageKey = "";
      const bannerFile = bannerImageFile();
      if (bannerFile) {
        bannerImageKey = (await AddImageToS3(
          bannerFile,
          title(),
          "blog"
        )) as string;
      }

      if (props.mode === "edit" || createdPostId()) {
        // Update existing post (either in edit mode or if autosave created it)
        await api.database.updatePost.mutate({
          id: createdPostId() || props.postId!,
          title: title().replaceAll(" ", "_"),
          subtitle: subtitle() || null,
          body: body() || "Hello, World!",
          banner_photo:
            bannerImageKey !== ""
              ? bannerImageKey
              : requestedDeleteImage()
                ? "_DELETE_IMAGE_"
                : null,
          published: published(),
          tags: tags().length > 0 ? tags() : null,
          author_id: props.userID
        });
      } else {
        // Create new post
        const result = await api.database.createPost.mutate({
          category: "blog",
          title: title().replaceAll(" ", "_"),
          subtitle: subtitle() || null,
          body: body() || "Hello, World!",
          banner_photo: bannerImageKey !== "" ? bannerImageKey : null,
          published: published(),
          tags: tags().length > 0 ? tags() : null,
          author_id: props.userID
        });
        setCreatedPostId(result.data as number);
      }

      navigate(`/blog/${encodeURIComponent(title().replaceAll(" ", "_"))}`);
    } catch (err) {
      console.error(`Error ${props.mode}ing post:`, err);
      setError(`Failed to ${props.mode} post. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="bg-base text-text min-h-screen overflow-x-hidden py-32">
      <div class="text-center text-2xl tracking-wide">
        {props.mode === "edit" ? "Edit a Blog" : "Create a Blog"}
      </div>
      <div class="flex h-full w-full justify-center">
        <form onSubmit={handleSubmit} class="w-full max-w-full px-4">
          <div class="mx-auto w-full md:w-3/4 xl:w-1/2">
            {/* Title */}
            <div class="input-group mx-4">
              <input
                type="text"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                name="title"
                placeholder=" "
                class="underlinedInput w-full bg-transparent"
              />
              <span class="bar"></span>
              <label class="underlinedInputLabel">Title</label>
            </div>

            {/* Subtitle */}
            <div class="input-group mx-4">
              <input
                type="text"
                value={subtitle()}
                onInput={(e) => setSubtitle(e.currentTarget.value)}
                name="subtitle"
                placeholder=" "
                class="underlinedInput w-full bg-transparent"
              />
              <span class="bar"></span>
              <label class="underlinedInputLabel">Subtitle</label>
            </div>

            {/* Banner */}
            <div class="pt-8 text-center text-xl">Banner</div>
            <div class="flex justify-center pb-8">
              <Dropzone
                onDrop={handleBannerImageDrop}
                accept="image/jpg, image/jpeg, image/png"
                fileHolder={bannerImageHolder()}
                preSet={
                  props.mode === "edit" && !requestedDeleteImage()
                    ? bannerPhoto() || null
                    : null
                }
              />
              <button
                type="button"
                class="z-50 -ml-6 h-fit rounded-full"
                onClick={removeBannerImage}
              >
                <XCircle
                  height={36}
                  width={36}
                  stroke={"currentColor"}
                  strokeWidth={1}
                />
              </button>
            </div>

            {/* Attachments */}
            <AddAttachmentSection
              type="blog"
              postId={props.postId}
              postTitle={title()}
              existingAttachments={
                props.mode === "edit" && props.initialData
                  ? (props.initialData as any)?.attachments
                  : undefined
              }
            />
          </div>

          {/* Text Editor */}
          <div class="w-full max-w-full overflow-hidden">
            <TextEditor updateContent={setBody} preSet={initialBody()} />
          </div>

          {/* Tags */}
          <TagMaker
            tagInputValue={tagInputValue()}
            tagHandler={tagHandler}
            tags={tags()}
            deleteTag={deleteTag}
          />

          {/* Auto-save message */}
          <div
            class={`${
              showAutoSaveMessage() ? "" : "user-select opacity-0"
            } text-green flex min-h-4 justify-center text-center italic transition-opacity duration-500 ease-in-out`}
          >
            {showAutoSaveMessage() ? "Auto save success!" : ""}
          </div>

          {/* Publish checkbox */}
          <div class="flex justify-end pt-4 pb-2">
            <input
              type="checkbox"
              class="my-auto"
              name="publish"
              checked={published()}
              onChange={(e) => setPublished(e.currentTarget.checked)}
            />
            <div class="my-auto px-2 text-sm font-normal">Published</div>
          </div>

          {/* Error message */}
          <Show when={error()}>
            <div class="text-red text-sm">{error()}</div>
          </Show>

          {/* Submit button */}
          <div class="flex justify-end">
            <button
              type="submit"
              disabled={loading()}
              class={`${
                loading()
                  ? "bg-surface2 cursor-not-allowed"
                  : published()
                    ? "bg-peach hover:brightness-125"
                    : "bg-green hover:brightness-125"
              } text-crust flex w-36 justify-center rounded py-3 transition-all duration-300 ease-out active:scale-90`}
            >
              {loading()
                ? "Loading..."
                : published()
                  ? "Publish!"
                  : "Save as Draft"}
            </button>
          </div>
        </form>
      </div>
      <Show when={props.mode === "edit"}>
        <div class="mt-2 flex justify-center">
          <a
            href={`/blog/${encodeURIComponent(title().replaceAll(" ", "_"))}`}
            class="border-lavender bg-blue rounded border px-4 py-2 text-base shadow-md transition-all duration-300 ease-in-out hover:brightness-125 active:scale-90"
          >
            Go to Post
          </a>
        </div>
      </Show>
    </div>
  );
}
