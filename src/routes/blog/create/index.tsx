import { Show, lazy } from "solid-js";
import { query, redirect } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { createAsync } from "@solidjs/router";
import { getUserState } from "~/lib/auth-query";
import { Spinner } from "~/components/Spinner";
import "../post.css";

const PostForm = lazy(() => import("~/components/blog/PostForm"));

const checkAdminAccess = query(async () => {
  "use server";
  // Reuse shared auth query for consistency
  const userState = await getUserState();

  if (userState.privilegeLevel !== "admin") {
    throw redirect("/401");
  }

  return { userID: userState.userId! };
}, "create-post-admin-check");

export const route = {
  load: () => checkAdminAccess()
};

export default function CreatePost() {
  const authState = createAsync(() => checkAdminAccess());

  return (
    <>
      <PageHead
        title="Create Blog Post"
        description="Create a new blog post with rich text editing, image uploads, and tag management."
      />

      <Show when={authState()?.userID} fallback={<Spinner />}>
        <PostForm mode="create" userID={authState()!.userID} />
      </Show>
    </>
  );
}
