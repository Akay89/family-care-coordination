-- 1. Activity log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX activity_log_circle_created_idx ON public.activity_log (circle_id, created_at DESC);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisers can read circle activity"
ON public.activity_log FOR SELECT TO authenticated
USING (public.is_circle_organiser(circle_id));

CREATE POLICY "Members can record their own activity"
ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (public.is_circle_member(circle_id) AND user_id = auth.uid());

-- 2. Consent record on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ;

-- 3. Helper: how many organisers a circle has
CREATE OR REPLACE FUNCTION public.circle_organiser_count(_circle_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.circle_members
  WHERE circle_id = _circle_id AND role = 'organiser';
$$;

-- 4. Helper: circles where the signed-in user is the only organiser
CREATE OR REPLACE FUNCTION public.my_sole_organiser_circles()
RETURNS TABLE(circle_id UUID, circle_name TEXT, other_members INTEGER)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name,
         (SELECT count(*)::int FROM public.circle_members m2
          WHERE m2.circle_id = c.id AND m2.user_id <> auth.uid())
  FROM public.care_circles c
  JOIN public.circle_members m ON m.circle_id = c.id AND m.user_id = auth.uid()
  WHERE m.role = 'organiser'
    AND public.circle_organiser_count(c.id) = 1;
$$;

-- 5. Least privilege on helper functions: not callable by unauthenticated callers
REVOKE EXECUTE ON FUNCTION public.accept_circle_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_circle(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.checklist_circle_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.circle_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_circle_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_circle_organiser(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_circle_with(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_circle_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.circle_organiser_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_sole_organiser_circles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_circle(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_circle_member(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_circle_organiser(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_edit_circle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_organiser(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.circle_organiser_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_sole_organiser_circles() TO authenticated;