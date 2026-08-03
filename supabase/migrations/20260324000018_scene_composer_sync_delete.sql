-- Allow org members to replace normalized composer sync tables.
-- These rows mirror scene_document JSON and are fully rewritten on save.
-- The previous USING (false) DELETE policies caused:
--   delete → 0 rows, insert → duplicate key on creative_studio_scene_objects_pkey

DROP POLICY IF EXISTS "creative_studio_scene_objects_no_hard_delete"
  ON public.creative_studio_scene_objects;
CREATE POLICY "creative_studio_scene_objects_delete_member"
  ON public.creative_studio_scene_objects FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));
GRANT DELETE ON public.creative_studio_scene_objects TO authenticated;

DROP POLICY IF EXISTS "creative_studio_scene_bindings_no_hard_delete"
  ON public.creative_studio_scene_bindings;
CREATE POLICY "creative_studio_scene_bindings_delete_member"
  ON public.creative_studio_scene_bindings FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));
GRANT DELETE ON public.creative_studio_scene_bindings TO authenticated;

DROP POLICY IF EXISTS "creative_studio_scene_keyframes_no_hard_delete"
  ON public.creative_studio_scene_keyframes;
CREATE POLICY "creative_studio_scene_keyframes_delete_member"
  ON public.creative_studio_scene_keyframes FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));
GRANT DELETE ON public.creative_studio_scene_keyframes TO authenticated;
