import { Show, createSignal, createEffect, onCleanup } from "solid-js";
import { useParams, useNavigate, query } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { getPrivilegeLevel, getUserID } from "~/server/utils";
import { api } from "~/lib/api";
import { ConnectionFactory } from "~/server/utils";
import Dropzone from "~/components/blog/Dropzone";
import TextEditor from "~/components/blog/TextEditor";
import TagMaker from "~/components/blog/TagMaker";
import AddAttachmentSection from "~/components/blog/AddAttachmentSection";
import XCircle from "~/components/icons/XCircle";
import AddImageToS3 from "~/lib/s3upload";

const getPostForEdit = query(async (id: string) => {
  "use server";

  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
  const userID = await getUserID(event.nativeEvent);

  const conn = ConnectionFactory();
  const query = `SELECT * FROM Post WHERE id = ?`;
  const results = await conn.execute({
    sql: query,
    args: [id]
  });

  const tagQuery = `SELECT * FROM Tag WHERE post_id = ?`;
  const tagRes = await conn.execute({
    sql: tagQuery,
    args: [id]
  });

  const post = results.rows[0];
  const tags = tagRes.rows;

  return { post, tags, privilegeLevel, userID };
}, "post-for-edit");

export default function EditPost() {
  const params = useParams();
  const navigate = useNavigate();

  const data = createAsync(() => getPostForEdit(params.id));

  const [title, setTitle] = createSignal("");
  const [subtitle, setSubtitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [bannerPhoto, setBannerPhoto] = createSignal("");
  const [bannerImageFile, setBannerImageFile] = createSignal<File>();
  const [bannerImageHolder, setBannerImageHolder] = createSignal<
    string | ArrayBuffer | null
  >(null);
  const [requestedDeleteImage, setRequestedDeleteImage] = createSignal(false);
  const [published, setPublished] = createSignal(false);
  const [tags, setTags] = createSignal<string[]>([]);
  const [tagInputValue, setTagInputValue] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [showAutoSaveMessage, setShowAutoSaveMessage] = createSignal(false);

  let autosaveInterval: number | undefined;

  // Populate form when data loads
  createEffect(() => {
    const postData = data();
    if (postData?.post) {
      const p = postData.post as any;
      setTitle(p.title?.replaceAll("_", " ") || "");
      setSubtitle(p.subtitle || "");
      setBody(p.body || "");
      setBannerPhoto(p.banner_photo || "");
      setPublished(p.published || false);

      if (postData.tags) {
        const tagValues = (postData.tags as any[]).map((t) => t.value);
        setTags(tagValues);
      }
    }
  });

  const autoSave = async () => {
    const titleVal = title();
    const postData = data();

    if (titleVal && postData?.post) {
      try {
        let bannerImageKey = "";
        const bannerFile = bannerImageFile();
        if (bannerFile) {
          bannerImageKey = (await AddImageToS3(
            bannerFile,
            titleVal,
            "blog"
          )) as string;
        }

        await api.database.updatePost.mutate({
          id: parseInt(params.id),
          title: titleVal.replaceAll(" ", "_"),
          subtitle: subtitle() || null,
          body: body() || null,
          banner_photo:
            bannerImageKey !== ""
              ? bannerImageKey
              : requestedDeleteImage()
                ? "_DELETE_IMAGE_"
                : null,
          published: published(),
          tags: tags().length > 0 ? tags() : null,
          author_id: data()!.userID
        });

        showAutoSaveTrigger();
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    }
  };

  const showAutoSaveTrigger = () => {
    setShowAutoSaveMessage(true);
    setTimeout(() => {
      setShowAutoSaveMessage(false);
    }, 5000);
  };

  // Set up autosave interval (2 minutes)
  autosaveInterval = setInterval(
    () => {
      autoSave();
    },
    2 * 60 * 1000
  ) as unknown as number;

  onCleanup(() => {
    if (autosaveInterval) {
      clearInterval(autosaveInterval);
    }
  });

  const handleBannerImageDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setRequestedDeleteImage(false);
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
    setRequestedDeleteImage(true);
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

    if (!data()?.userID) {
      setError("You must be logged in to edit posts");
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

      await api.database.updatePost.mutate({
        id: parseInt(params.id),
        title: title().replaceAll(" ", "_"),
        subtitle: subtitle() || null,
        body: body() || null,
        banner_photo:
          bannerImageKey !== ""
            ? bannerImageKey
            : requestedDeleteImage()
              ? "_DELETE_IMAGE_"
              : null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: data()!.userID
      });

      navigate(`/blog/${encodeURIComponent(title().replaceAll(" ", "_"))}`);
    } catch (err) {
      console.error("Error updating post:", err);
      setError("Failed to update post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title>Edit Post | Michael Freno</Title>

      <Show
        when={data()?.privilegeLevel === "admin"}
        fallback={
          <div class="w-full pt-[30vh] text-center">
            <div class="text-text text-2xl">Unauthorized</div>
            <div class="text-subtext0 mt-4">
              You must be an admin to edit posts.
            </div>
          </div>
        }
      >
        <Show
          when={data()}
          fallback={
            <div class="w-full pt-[30vh] text-center">
              <div class="text-text text-xl">Loading post...</div>
            </div>
          }
        >
          <div class="bg-base text-text min-h-screen px-8 py-32">
            <div class="text-center text-2xl tracking-wide">Edit a Blog</div>
            <div class="flex h-full w-full justify-center">
              <form
                onSubmit={handleSubmit}
                class="w-full md:w-3/4 lg:w-1/3 xl:w-1/2"
              >
                {/* Title */}
                <div class="input-group mx-4">
                  <input
                    type="text"
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                    required
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
                      requestedDeleteImage() ? null : bannerPhoto() || null
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
                  postId={parseInt(params.id)}
                  postTitle={title()}
                  existingAttachments={
                    (data()?.post as any)?.attachments || undefined
                  }
                />

                {/* Text Editor */}
                <div class="-mx-6 md:-mx-36">
                  <TextEditor updateContent={setBody} preSet={body()} />
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
                  } text-green flex min-h-[16px] justify-center text-center italic transition-opacity duration-500 ease-in-out`}
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
            <div class="mt-2 flex justify-center">
              <a
                href={`/blog/${encodeURIComponent(title().replaceAll(" ", "_"))}`}
                class="border-blue bg-blue hover:bg-blue rounded border px-4 py-2 shadow-md transition-all duration-300 ease-in-out hover:brightness-125 active:scale-90"
              >
                Go to Post
              </a>
            </div>
          </div>
        </Show>
      </Show>
    </>
  );
}
