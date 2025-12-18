import { Show, createSignal } from "solid-js";
import { useSearchParams, useNavigate, query } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { getPrivilegeLevel, getUserID } from "~/server/utils";
import { api } from "~/lib/api";

const getAuthState = query(async () => {
  "use server";

  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
  const userID = await getUserID(event.nativeEvent);

  return { privilegeLevel, userID };
}, "auth-state");

export default function CreatePost() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const authState = createAsync(() => getAuthState());

  const [title, setTitle] = createSignal("");
  const [subtitle, setSubtitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [bannerPhoto, setBannerPhoto] = createSignal("");
  const [published, setPublished] = createSignal(false);
  const [tags, setTags] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!authState()?.userID) {
      setError("You must be logged in to create a post");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await api.database.createPost.mutate({
        category: "blog",
        title: title(),
        subtitle: subtitle() || null,
        body: body() || null,
        banner_photo: bannerPhoto() || null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: authState()!.userID
      });

      if (result.data) {
        // Redirect to the new post
        navigate(`/blog/${encodeURIComponent(title())}`);
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Title>Create Blog Post | Michael Freno</Title>

      <Show
        when={authState()?.privilegeLevel === "admin"}
        fallback={
          <div class="w-full pt-[30vh] text-center">
            <div class="text-text text-2xl">Unauthorized</div>
            <div class="text-subtext0 mt-4">
              You must be an admin to create posts.
            </div>
          </div>
        }
      >
        <div class="bg-base min-h-screen px-4 py-12">
          <div class="mx-auto max-w-4xl">
            <h1 class="mb-8 text-center text-4xl font-bold">
              Create Blog Post
            </h1>

            <form onSubmit={handleSubmit} class="space-y-6">
              {/* Title */}
              <div>
                <label for="title" class="mb-2 block text-sm font-medium">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title()}
                  onInput={(e) => setTitle(e.currentTarget.value)}
                  class="border-surface2 bg-surface0 w-full rounded-md border px-4 py-2"
                  placeholder="Enter post title"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label for="subtitle" class="mb-2 block text-sm font-medium">
                  Subtitle
                </label>
                <input
                  id="subtitle"
                  type="text"
                  value={subtitle()}
                  onInput={(e) => setSubtitle(e.currentTarget.value)}
                  class="border-surface2 bg-surface0 w-full rounded-md border px-4 py-2"
                  placeholder="Enter post subtitle"
                />
              </div>

              {/* Body */}
              <div>
                <label for="body" class="mb-2 block text-sm font-medium">
                  Body (HTML)
                </label>
                <textarea
                  id="body"
                  rows={15}
                  value={body()}
                  onInput={(e) => setBody(e.currentTarget.value)}
                  class="border-surface2 bg-surface0 w-full rounded-md border px-4 py-2 font-mono text-sm"
                  placeholder="Enter post content (HTML)"
                />
              </div>

              {/* Banner Photo URL */}
              <div>
                <label for="banner" class="mb-2 block text-sm font-medium">
                  Banner Photo URL
                </label>
                <input
                  id="banner"
                  type="text"
                  value={bannerPhoto()}
                  onInput={(e) => setBannerPhoto(e.currentTarget.value)}
                  class="border-surface2 bg-surface0 w-full rounded-md border px-4 py-2"
                  placeholder="Enter banner photo URL"
                />
              </div>

              {/* Tags */}
              <div>
                <label for="tags" class="mb-2 block text-sm font-medium">
                  Tags (comma-separated)
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags().join(", ")}
                  onInput={(e) =>
                    setTags(
                      e.currentTarget.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    )
                  }
                  class="border-surface2 bg-surface0 w-full rounded-md border px-4 py-2"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              {/* Published */}
              <div class="flex items-center gap-2">
                <input
                  id="published"
                  type="checkbox"
                  checked={published()}
                  onChange={(e) => setPublished(e.currentTarget.checked)}
                  class="h-4 w-4"
                />
                <label for="published" class="text-sm font-medium">
                  Publish immediately
                </label>
              </div>

              {/* Error message */}
              <Show when={error()}>
                <div class="text-red text-sm">{error()}</div>
              </Show>

              {/* Submit button */}
              <div class="flex gap-4">
                <button
                  type="submit"
                  disabled={loading()}
                  class={`flex-1 rounded-md px-6 py-3 text-base transition-all ${
                    loading()
                      ? "bg-blue cursor-not-allowed brightness-50"
                      : "bg-blue hover:brightness-125 active:scale-95"
                  }`}
                >
                  {loading() ? "Creating..." : "Create Post"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/blog")}
                  class="border-surface2 rounded-md border px-6 py-3 transition-all hover:brightness-125"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </>
  );
}
