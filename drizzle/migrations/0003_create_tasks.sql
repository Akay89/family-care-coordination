CREATE TYPE public.task_status AS ENUM ('todo', 'done');
CREATE TYPE public.task_recurrence AS ENUM ('none', 'daily', 'weekly', 'monthly');

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  assigned_to uuid,
  status public.task_status NOT NULL DEFAULT 'todo',
  completed_by uuid,
  completed_at timestamptz,
  recurrence public.task_recurrence NOT NULL DEFAULT 'none',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tasks_circle_status_idx ON public.tasks (circle_id, status, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read tasks" ON public.tasks
  FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Members can add tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_circle(circle_id) AND created_by = auth.uid());
CREATE POLICY "Members can update tasks" ON public.tasks
  FOR UPDATE TO authenticated USING (public.can_edit_circle(circle_id)) WITH CHECK (public.can_edit_circle(circle_id));
CREATE POLICY "Members can delete tasks" ON public.tasks
  FOR DELETE TO authenticated USING (public.can_edit_circle(circle_id));