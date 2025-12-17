import { Show, createSignal, createEffect } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { cache } from "@solidjs/router";
import { api } from "~/lib/api";
import { ConnectionFactory } from "~/server/utils";

// Server function to fetch post for editing
const getPostForEdit = cache(async (id: string) => {
  "use server";
  
  const conn = ConnectionFactory();
  const query = `SELECT * FROM Post WHERE id = ?`;
  const results = await conn.execute({
    sql: query,
    args: [id],
  });

  const tagQuery = `SELECT * FROM Tag WHERE post_id = ?`;
  const tagRes = await conn.execute({
    sql: tagQuery,
    args: [id],
  });

  const post = results.rows[0];
  const tags = tagRes.rows;
  
  return { post, tags };
}, "post-for-edit");

export default function EditPost() {
  const params = useParams();
  const navigate = useNavigate();
  
  // TODO: Get actual privilege level from session/auth
  const privilegeLevel = "anonymous";
  const userID = null;
  
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
        const tagValues = (postData.tags as any[]).map(t => t.value);
        setTags(tagValues);
      }
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!userID) {
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
        author_id: userID,
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
        when={privilegeLevel === "admin"}
        fallback={
          <div class="w-full pt-[30vh] text-center">
            <div class="text-2xl">Unauthorized</div>
            <div class="text-gray-600 dark:text-gray-400 mt-4">
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
          <div class="min-h-screen bg-white dark:bg-zinc-900 py-12 px-4">
            <div class="max-w-4xl mx-auto">
              <h1 class="text-4xl font-bold text-center mb-8">Edit Post</h1>
              
              <form onSubmit={handleSubmit} class="space-y-6">
                {/* Title */}
                <div>
                  <label for="title" class="block text-sm font-medium mb-2">
                    Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    required
                    value={title()}
                    onInput={(e) => setTitle(e.currentTarget.value)}
                    class="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                    placeholder="Enter post title"
                  />
                </div>
                
                {/* Subtitle */}
                <div>
                  <label for="subtitle" class="block text-sm font-medium mb-2">
                    Subtitle
                  </label>
                  <input
                    id="subtitle"
                    type="text"
                    value={subtitle()}
                    onInput={(e) => setSubtitle(e.currentTarget.value)}
                    class="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                    placeholder="Enter post subtitle"
                  />
                </div>
                
                {/* Body */}
                <div>
                  <label for="body" class="block text-sm font-medium mb-2">
                    Body (HTML)
                  </label>
                  <textarea
                    id="body"
                    rows={15}
                    value={body()}
                    onInput={(e) => setBody(e.currentTarget.value)}
                    class="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700 font-mono text-sm"
                    placeholder="Enter post content (HTML)"
                  />
                </div>
                
                {/* Banner Photo URL */}
                <div>
                  <label for="banner" class="block text-sm font-medium mb-2">
                    Banner Photo URL
                  </label>
                  <input
                    id="banner"
                    type="text"
                    value={bannerPhoto()}
                    onInput={(e) => setBannerPhoto(e.currentTarget.value)}
                    class="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                    placeholder="Enter banner photo URL"
                  />
                </div>
                
                {/* Tags */}
                <div>
                  <label for="tags" class="block text-sm font-medium mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    id="tags"
                    type="text"
                    value={tags().join(", ")}
                    onInput={(e) => setTags(e.currentTarget.value.split(",").map(t => t.trim()).filter(Boolean))}
                    class="w-full px-4 py-2 border border-gray-300 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
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
                  <div class="text-red-500 text-sm">{error()}</div>
                </Show>
                
                {/* Submit button */}
                <div class="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading()}
                    class={`flex-1 px-6 py-3 rounded-md text-white transition-all ${
                      loading()
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 active:scale-95"
                    }`}
                  >
                    {loading() ? "Saving..." : "Save Changes"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => navigate(`/blog/${encodeURIComponent(title())}`)}
                    class="px-6 py-3 rounded-md border border-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
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
