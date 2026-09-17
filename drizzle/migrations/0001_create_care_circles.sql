-- Enum for roles inside a care circle
CREATE TYPE public.circle_role AS ENUM ('organiser', 'member', 'viewer');

CREATE TABLE public.care_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cared_for_name TEXT NOT NULL DEFAULT '',
  cared_for_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.circle_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

CREATE TABLE public.circle_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.circle_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_circle_members_user ON public.circle_members(user_id);
CREATE INDEX idx_circle_invites_circle ON public.circle_invites(circle_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_circles TO authenticated;
GRANT ALL ON public.care_circles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;
GRANT ALL ON public.circle_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_invites TO authenticated;
GRANT ALL ON public.circle_invites TO service_role;

-- Reusable helpers (security definer so policies never recurse)
CREATE OR REPLACE FUNCTION public.is_circle_member(_circle_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = _circle_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.circle_role(_circle_id UUID)
RETURNS public.circle_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.circle_members
  WHERE circle_id = _circle_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_circle_organiser(_circle_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.circle_role(_circle_id) = 'organiser';
$$;

CREATE OR REPLACE FUNCTION public.can_edit_circle(_circle_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.circle_role(_circle_id) IN ('organiser', 'member');
$$;

CREATE OR REPLACE FUNCTION public.shares_circle_with(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members mine
    JOIN public.circle_members theirs ON theirs.circle_id = mine.circle_id
    WHERE mine.user_id = auth.uid() AND theirs.user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_circle_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.circle_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_organiser(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_circle(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_circle_with(UUID) TO authenticated;

ALTER TABLE public.care_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their circles" ON public.care_circles
  FOR SELECT TO authenticated USING (public.is_circle_member(id));
CREATE POLICY "Signed-in users can create circles" ON public.care_circles
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Organisers can update their circle" ON public.care_circles
  FOR UPDATE TO authenticated USING (public.is_circle_organiser(id))
  WITH CHECK (public.is_circle_organiser(id));
CREATE POLICY "Organisers can delete their circle" ON public.care_circles
  FOR DELETE TO authenticated USING (public.is_circle_organiser(id));

CREATE POLICY "Members can read the member list" ON public.circle_members
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Organisers can add members" ON public.circle_members
  FOR INSERT TO authenticated WITH CHECK (public.is_circle_organiser(circle_id));
CREATE POLICY "Organisers can change roles" ON public.circle_members
  FOR UPDATE TO authenticated USING (public.is_circle_organiser(circle_id))
  WITH CHECK (public.is_circle_organiser(circle_id));
CREATE POLICY "Organisers can remove members, anyone can leave" ON public.circle_members
  FOR DELETE TO authenticated
  USING (public.is_circle_organiser(circle_id) OR user_id = auth.uid());

CREATE POLICY "Organisers can read invites" ON public.circle_invites
  FOR SELECT TO authenticated USING (public.is_circle_organiser(circle_id));
CREATE POLICY "Organisers can create invites" ON public.circle_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_organiser(circle_id) AND invited_by = auth.uid());
CREATE POLICY "Organisers can update invites" ON public.circle_invites
  FOR UPDATE TO authenticated USING (public.is_circle_organiser(circle_id))
  WITH CHECK (public.is_circle_organiser(circle_id));
CREATE POLICY "Organisers can delete invites" ON public.circle_invites
  FOR DELETE TO authenticated USING (public.is_circle_organiser(circle_id));

-- Co-members can see each other's names
CREATE POLICY "Circle mates can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.shares_circle_with(id));

-- Creator automatically becomes organiser
CREATE OR REPLACE FUNCTION public.add_creator_as_organiser()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'organiser')
  ON CONFLICT (circle_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_care_circle_created
AFTER INSERT ON public.care_circles
FOR EACH ROW EXECUTE FUNCTION public.add_creator_as_organiser();

-- At least one organiser must always remain
CREATE OR REPLACE FUNCTION public.protect_last_organiser()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  organisers INT;
BEGIN
  IF OLD.role <> 'organiser' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role = 'organiser' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO organisers
  FROM public.circle_members
  WHERE circle_id = OLD.circle_id AND role = 'organiser';

  IF organisers <= 1 THEN
    RAISE EXCEPTION 'A care circle must always have at least one organiser';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER circle_members_protect_last_organiser
BEFORE UPDATE OR DELETE ON public.circle_members
FOR EACH ROW EXECUTE FUNCTION public.protect_last_organiser();

-- Invite preview (safe, minimal details) and acceptance
CREATE OR REPLACE FUNCTION public.circle_invite_preview(_token TEXT)
RETURNS TABLE (circle_id UUID, circle_name TEXT, cared_for_name TEXT, invite_role public.circle_role, valid BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.cared_for_name, i.role,
         (i.accepted_at IS NULL AND i.expires_at > now())
  FROM public.circle_invites i
  JOIN public.care_circles c ON c.id = i.circle_id
  WHERE i.token = _token;
$$;

CREATE OR REPLACE FUNCTION public.accept_circle_invite(_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.circle_invites;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to accept an invite';
  END IF;

  SELECT * INTO inv FROM public.circle_invites WHERE token = _token;

  IF inv IS NULL THEN
    RAISE EXCEPTION 'This invite link is not valid';
  END IF;

  IF inv.expires_at <= now() THEN
    RAISE EXCEPTION 'This invite link has expired';
  END IF;

  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (inv.circle_id, auth.uid(), inv.role)
  ON CONFLICT (circle_id, user_id) DO NOTHING;

  UPDATE public.circle_invites
  SET accepted_at = COALESCE(accepted_at, now())
  WHERE id = inv.id;

  RETURN inv.circle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.circle_invite_preview(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.accept_circle_invite(TEXT) TO authenticated;