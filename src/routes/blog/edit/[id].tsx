import { Show, lazy } from "solid-js";
import { useParams, query, redirect } from "@solidjs/router";
import { PageHead } from "~/components/PageHead";
import { createAsync } from "@solidjs/router";
import "../post.css";

const PostForm = lazy(() => import("~/components/blog/PostForm"));

const getPostForEdit = query(async (id: string) => {
  "use server";
  const { getUserState } = await import("~/lib/auth-query");
  const { ConnectionFactory } = await import("~/server/utils");
  const userState = await getUserState();

  if (userState.privilegeLevel !== "admin") {
    throw redirect("/401");
  }

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

  return {
    post,
    tags,
    privilegeLevel: userState.privilegeLevel,
    userID: userState.userId
  };
}, "post-for-edit");

export const route = {
  load: ({ params }: { params: { id: string } }) => getPostForEdit(params.id)
};

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
      published: Boolean(p.published),
      tags: tagValues,
      attachments: p.attachments
    };
  };

  return (
    <>
      <PageHead
        title="Edit Post"
        description="Edit your blog post with rich text editing, image management, and tag updates."
      />

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
    </>
  );
}
