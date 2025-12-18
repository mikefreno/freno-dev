import { Show, createSignal, createEffect } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { cache } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { getPrivilegeLevel, getUserID } from "~/server/utils";
import { api } from "~/lib/api";
import { ConnectionFactory } from "~/server/utils";

// Server function to fetch post for editing
const getPostForEdit = cache(async (id: string) => {
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
  const [published, setPublished] = createSignal(false);
  const [tags, setTags] = createSignal<string[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  // Populate form when data loads
  createEffect(() => {
    const postData = data();
    if (postData?.post) {
      const p = postData.post as any;
      setTitle(p.title || "");
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

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!data()?.userID) {
      setError("You must be logged in to edit posts");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.database.updatePost.mutate({
        id: parseInt(params.id),
        title: title(),
        subtitle: subtitle() || null,
        body: body() || null,
        banner_photo: bannerPhoto() || null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: data()!.userID
      });

      // Redirect to the post
      navigate(`/blog/${encodeURIComponent(title())}`);
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
            <div class="text-2xl">Unauthorized</div>
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
              <div class="text-xl">Loading post...</div>
            </div>
          }
        >
          <div class="bg-base min-h-screen px-4 py-12">
            <div class="mx-auto max-w-4xl">
              <h1 class="mb-8 text-center text-4xl font-bold">Edit Post</h1>

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
                    class="w-full rounded-md border border-surface2 bg-surface0 px-4 py-2"
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
                    class="w-full rounded-md border border-surface2 bg-surface0 px-4 py-2"
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
                    class="w-full rounded-md border border-surface2 bg-surface0 px-4 py-2 font-mono text-sm"
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
                    class="w-full rounded-md border border-surface2 bg-surface0 px-4 py-2"
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
                    class="w-full rounded-md border border-surface2 bg-surface0 px-4 py-2"
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
                    Published
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
                    {loading() ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/blog/${encodeURIComponent(title())}`)
                    }
                    class="border-surface2 rounded-md border px-6 py-3 transition-all hover:brightness-125"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>
      </Show>
    </>
  );
}
