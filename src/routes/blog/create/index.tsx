import { Show, lazy } from "solid-js";
import { query, redirect } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getEvent } from "vinxi/http";
import { Spinner } from "~/components/Spinner";
import "../post.css";

const PostForm = lazy(() => import("~/components/blog/PostForm"));

const getAuthState = query(async () => {
  "use server";
  const { getPrivilegeLevel, getUserID } = await import("~/server/utils");
  const event = getEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event);
  const userID = await getUserID(event);

  if (privilegeLevel !== "admin") {
    throw redirect("/401");
  }

  return { privilegeLevel, userID };
}, "create-post-auth");

export const route = {
  load: () => getAuthState()
};

export default function CreatePost() {
  const authState = createAsync(() => getAuthState());

  return (
    <>
      <Title>Create Blog Post | Michael Freno</Title>
      <Meta
        name="description"
        content="Create a new blog post with rich text editing, image uploads, and tag management."
      />

      <Show when={authState()?.userID} fallback={<Spinner />}>
        <PostForm mode="create" userID={authState()!.userID} />
      </Show>
    </>
  );
}
