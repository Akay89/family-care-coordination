-- Internal helper functions: only ever called from inside other SECURITY DEFINER
-- functions, so API roles do not need EXECUTE on them.
REVOKE ALL ON FUNCTION public.circle_role(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.circle_organiser_count(uuid) FROM anon, authenticated;

-- Invite preview is now served by a trusted server handler, so it no longer
-- needs to be callable straight from the browser.
REVOKE ALL ON FUNCTION public.circle_invite_preview(text) FROM anon, authenticated, public;

-- Storage: allow in-place replacement of a document only by its uploader or a
-- circle organiser, matching the delete policy.
CREATE POLICY "Uploader or organiser can update circle documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'circle-documents'
  AND (owner = auth.uid() OR public.is_circle_organiser(((storage.foldername(name))[1])::uuid))
)
WITH CHECK (
  bucket_id = 'circle-documents'
  AND (owner = auth.uid() OR public.is_circle_organiser(((storage.foldername(name))[1])::uuid))
);