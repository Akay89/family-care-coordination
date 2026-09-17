CREATE TABLE public.updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX updates_circle_created_idx ON public.updates (circle_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.updates TO authenticated;
GRANT ALL ON public.updates TO service_role;

ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read updates" ON public.updates
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Members can post updates" ON public.updates
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_circle(circle_id) AND author_id = auth.uid());
CREATE POLICY "Authors can edit their updates" ON public.updates
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors or organisers can delete updates" ON public.updates
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_circle_organiser(circle_id));

CREATE OR REPLACE FUNCTION public.update_circle_id(_update_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT circle_id FROM public.updates WHERE id = _update_id;
$$;

CREATE TABLE public.update_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL CHECK (emoji IN ('❤️', '👍', '🙏')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (update_id, user_id, emoji)
);

CREATE INDEX update_reactions_update_idx ON public.update_reactions (update_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_reactions TO authenticated;
GRANT ALL ON public.update_reactions TO service_role;

ALTER TABLE public.update_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read reactions" ON public.update_reactions
  FOR SELECT TO authenticated
  USING (public.is_circle_member(public.update_circle_id(update_id)));
CREATE POLICY "Members can react" ON public.update_reactions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_member(public.update_circle_id(update_id)) AND user_id = auth.uid());
CREATE POLICY "People can remove their reaction" ON public.update_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.update_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES public.updates(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX update_comments_update_idx ON public.update_comments (update_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.update_comments TO authenticated;
GRANT ALL ON public.update_comments TO service_role;

ALTER TABLE public.update_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read comments" ON public.update_comments
  FOR SELECT TO authenticated
  USING (public.is_circle_member(public.update_circle_id(update_id)));
CREATE POLICY "Members can comment" ON public.update_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_member(public.update_circle_id(update_id)) AND author_id = auth.uid());
CREATE POLICY "Authors can edit their comments" ON public.update_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors or organisers can delete comments" ON public.update_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_circle_organiser(public.update_circle_id(update_id)));

ALTER PUBLICATION supabase_realtime ADD TABLE public.updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.update_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.update_comments;