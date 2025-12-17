import { Show, createSignal } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { api } from "~/lib/api";

export default function CreatePost() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // TODO: Get actual privilege level from session/auth
  const privilegeLevel = "anonymous";
  const userID = null;
  
  const category = () => searchParams.category === "project" ? "project" : "blog";
  
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
    
    if (!userID) {
      setError("You must be logged in to create a post");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const result = await api.database.createPost.mutate({
        category: category(),
        title: title(),
        subtitle: subtitle() || null,
        body: body() || null,
        banner_photo: bannerPhoto() || null,
        published: published(),
        tags: tags().length > 0 ? tags() : null,
        author_id: userID,
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
      <Title>Create {category() === "project" ? "Project" : "Blog Post"} | Michael Freno</Title>
      
      <Show
        when={privilegeLevel === "admin"}
        fallback={
          <div class="w-full pt-[30vh] text-center">
            <div class="text-2xl">Unauthorized</div>
            <div class="text-gray-600 dark:text-gray-400 mt-4">
              You must be an admin to create posts.
            </div>
          </div>
        }
      >
        <div class="min-h-screen bg-white dark:bg-zinc-900 py-12 px-4">
          <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl font-bold text-center mb-8">
              Create {category() === "project" ? "Project" : "Blog Post"}
            </h1>
            
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
                  Publish immediately
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
                  {loading() ? "Creating..." : "Create Post"}
                </button>
                
                <button
                  type="button"
                  onClick={() => navigate("/blog")}
                  class="px-6 py-3 rounded-md border border-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
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
