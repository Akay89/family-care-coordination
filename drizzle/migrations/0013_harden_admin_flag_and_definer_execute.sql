-- 1. Prevent self-escalation: users may update only their own safe profile columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, consent_accepted_at) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2. Service-role variant of the sole-organiser helper so signed-in users no longer
--    need EXECUTE on a SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION public.my_sole_organiser_circles(_user_id uuid)
RETURNS TABLE(circle_id uuid, circle_name text, other_members integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.name,
         (SELECT count(*)::int FROM public.circle_members m2
          WHERE m2.circle_id = c.id AND m2.user_id <> _user_id)
  FROM public.care_circles c
  JOIN public.circle_members m ON m.circle_id = c.id AND m.user_id = _user_id
  WHERE m.role = 'organiser'
    AND public.circle_organiser_count(c.id) = 1;
$$;

REVOKE ALL ON FUNCTION public.my_sole_organiser_circles(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_sole_organiser_circles(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.my_sole_organiser_circles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_sole_organiser_circles() TO service_role;

-- 3. Confirm notification_log stays service-role write only.
REVOKE INSERT, UPDATE, DELETE ON public.notification_log FROM authenticated, anon;
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
