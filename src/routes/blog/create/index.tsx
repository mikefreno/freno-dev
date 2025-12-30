import { Show } from "solid-js";
import { query, redirect } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getEvent } from "vinxi/http";
import PostForm from "~/components/blog/PostForm";
import "../post.css";

const getAuthState = query(async () => {
  "use server";
  const { getPrivilegeLevel, getUserID } = await import("~/server/utils");
  const event = getEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event);
  const userID = await getUserID(event);

  // Return 401 for non-admin users
  if (privilegeLevel !== "admin") {
    throw new Response("Unauthorized", { status: 401 });
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

      <Show when={authState()?.userID}>
        <PostForm mode="create" userID={authState()!.userID} />
      </Show>
    </>
  );
}
