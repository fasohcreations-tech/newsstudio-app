-- Soft-delete (SET deleted_at) failed under RLS: UPDATE WITH CHECK inherited
-- `deleted_at is null` from USING, so the post-update row was rejected.
-- Clear queue now hard-deletes; this still allows soft-delete if used later.

drop policy if exists "story_video_renders_update_member" on public.story_video_renders;

create policy "story_video_renders_update_member"
  on public.story_video_renders for update
  using (
    deleted_at is null
    and public.is_org_member(organization_id)
  )
  with check (
    public.is_org_member(organization_id)
  );
