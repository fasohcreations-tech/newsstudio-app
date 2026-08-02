import { redirect } from "next/navigation";

export default async function LegacyGraphicsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; trackId?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.trackId) params.set("trackId", query.trackId);
  const suffix = params.toString();
  redirect(`/creative-studio/scenes${suffix ? `?${suffix}` : ""}`);
}
