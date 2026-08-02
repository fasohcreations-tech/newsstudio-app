import { redirect } from "next/navigation";

type LegacyStoryPageProps = {
  params: Promise<{ storyId: string }>;
};

/**
 * Legacy story detail route — redirects into the Story Workspace.
 */
export default async function LegacyStoryDetailRedirect({
  params,
}: LegacyStoryPageProps) {
  const { storyId } = await params;
  redirect(`/newsroom/stories/${storyId}`);
}
