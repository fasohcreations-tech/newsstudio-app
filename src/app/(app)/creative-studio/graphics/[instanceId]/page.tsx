import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ instanceId: string }>;
  searchParams: Promise<{ projectId?: string; trackId?: string }>;
};

/** Legacy graphics instance URLs redirect to motion scene editor when possible. */
export default async function LegacyGraphicsInstanceRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const { instanceId } = await params;
  const query = await searchParams;
  const urlParams = new URLSearchParams();
  if (query.projectId) urlParams.set("projectId", query.projectId);
  if (query.trackId) urlParams.set("trackId", query.trackId);
  const suffix = urlParams.toString();
  redirect(
    `/creative-studio/scenes/${instanceId}${suffix ? `?${suffix}` : ""}`,
  );
}
