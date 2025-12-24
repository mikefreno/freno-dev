import { Show } from "solid-js";
import { query } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import PostForm from "~/components/blog/PostForm";
import "../post.css";

const getAuthState = query(async () => {
  "use server";
  const { getPrivilegeLevel, getUserID } = await import("~/server/utils");
  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);
  const userID = await getUserID(event.nativeEvent);

  return { privilegeLevel, userID };
}, "auth-state");

export default function CreatePost() {
  const authState = createAsync(() => getAuthState());

  return (
    <>
      <Title>Create Blog Post | Michael Freno</Title>
      <Meta
        name="description"
        content="Create a new blog post with rich text editing, image uploads, and tag management."
      />

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
        <Show when={authState()?.userID}>
          <PostForm mode="create" userID={authState()!.userID} />
        </Show>
      </Show>
    </>
  );
}
