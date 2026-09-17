CREATE TYPE public.event_type AS ENUM ('appointment', 'visit', 'collection', 'other');

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type public.event_type NOT NULL DEFAULT 'other',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location TEXT,
  notes TEXT,
  assigned_to UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_circle_start_idx ON public.events (circle_id, start_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read events" ON public.events
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));

CREATE POLICY "Members can add events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_circle(circle_id) AND created_by = auth.uid());

CREATE POLICY "Members can update events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.can_edit_circle(circle_id))
  WITH CHECK (public.can_edit_circle(circle_id));

CREATE POLICY "Members can delete events" ON public.events
  FOR DELETE TO authenticated USING (public.can_edit_circle(circle_id));