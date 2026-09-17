CREATE TYPE public.document_category AS ENUM ('benefits', 'legal', 'letters', 'insurance', 'other');

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  file_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  category public.document_category NOT NULL DEFAULT 'other',
  description text,
  uploaded_by uuid NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX documents_circle_created_idx ON public.documents (circle_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read documents" ON public.documents
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));

CREATE POLICY "Members can add documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_circle(circle_id) AND uploaded_by = auth.uid());

CREATE POLICY "Uploader or organiser can update documents" ON public.documents
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_circle_organiser(circle_id))
  WITH CHECK (uploaded_by = auth.uid() OR public.is_circle_organiser(circle_id));

CREATE POLICY "Uploader or organiser can delete documents" ON public.documents
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_circle_organiser(circle_id));

-- Storage policies: path is <circle_id>/<uuid>-<name>
CREATE POLICY "Circle members can read circle documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'circle-documents'
    AND public.is_circle_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Circle editors can upload circle documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'circle-documents'
    AND public.can_edit_circle(((storage.foldername(name))[1])::uuid)
    AND owner = auth.uid()
  );

CREATE POLICY "Uploader or organiser can delete circle documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'circle-documents'
    AND (
      owner = auth.uid()
      OR public.is_circle_organiser(((storage.foldername(name))[1])::uuid)
    )
  );
