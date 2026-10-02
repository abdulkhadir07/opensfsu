import { PageHeader } from "@/components/ui";
import { NewPostForm } from "@/components/new-post-form";

export default async function NewPost({ searchParams }: PageProps<"/new">) {
  const text = (await searchParams).text;
  return (
    <div>
      <PageHeader title="Start an invite" sub="Say what you want to do and we'll turn it into an invite." />
      <NewPostForm initialText={typeof text === "string" ? text.slice(0, 500) : ""} />
    </div>
  );
}
