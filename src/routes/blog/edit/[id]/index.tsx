import { Show } from "solid-js";
import { useParams, query } from "@solidjs/router";
import { Title, Meta } from "@solidjs/meta";
import { createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import PostForm from "~/components/blog/PostForm";

const getPostForEdit = query(async (id: string) => {
  "use server";
  const { getPrivilegeLevel, getUserID, ConnectionFactory } =
    await import("~/server/utils");
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
  const data = createAsync(() => getPostForEdit(params.id));

  const postData = () => {
    const d = data();
    if (!d?.post) return null;

    const p = d.post as any;
    const tagValues = d.tags ? (d.tags as any[]).map((t) => t.value) : [];

    return {
      title: p.title?.replaceAll("_", " ") || "",
      subtitle: p.subtitle || "",
      body: p.body || "",
      banner_photo: p.banner_photo || "",
      published: p.published || false,
      tags: tagValues,
      attachments: p.attachments
    };
  };

  return (
    <>
      <Title>Edit Post | Michael Freno</Title>
      <Meta
        name="description"
        content="Edit your blog post with rich text editing, image management, and tag updates."
      />

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
          when={data() && postData()}
          fallback={
            <div class="w-full pt-[30vh] text-center">
              <div class="text-text text-xl">Loading post...</div>
            </div>
          }
        >
          <PostForm
            mode="edit"
            postId={parseInt(params.id)}
            initialData={postData()!}
            userID={data()!.userID}
          />
        </Show>
      </Show>
    </>
  );
}
