-- Admin flag on profiles (guarded: only admins can change it)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.protect_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change admin rights';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_is_admin ON public.profiles;
CREATE TRIGGER profiles_protect_is_admin
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_is_admin();

-- Global templates
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read templates" ON public.checklist_templates
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create templates" ON public.checklist_templates
FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update templates" ON public.checklist_templates
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete templates" ON public.checklist_templates
FOR DELETE TO authenticated USING (public.is_admin());

CREATE TABLE public.checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  help_text text,
  link_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checklist_template_items_template_idx ON public.checklist_template_items (template_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_template_items TO authenticated;
GRANT ALL ON public.checklist_template_items TO service_role;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read template items" ON public.checklist_template_items
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can create template items" ON public.checklist_template_items
FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update template items" ON public.checklist_template_items
FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins can delete template items" ON public.checklist_template_items
FOR DELETE TO authenticated USING (public.is_admin());

-- Circle copies
CREATE TABLE public.circle_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.care_circles(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  started_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX circle_checklists_circle_idx ON public.circle_checklists (circle_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_checklists TO authenticated;
GRANT ALL ON public.circle_checklists TO service_role;
ALTER TABLE public.circle_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read circle checklists" ON public.circle_checklists
FOR SELECT TO authenticated USING (public.is_circle_member(circle_id));
CREATE POLICY "Members can start circle checklists" ON public.circle_checklists
FOR INSERT TO authenticated WITH CHECK (public.can_edit_circle(circle_id) AND started_by = auth.uid());
CREATE POLICY "Members can update circle checklists" ON public.circle_checklists
FOR UPDATE TO authenticated USING (public.can_edit_circle(circle_id)) WITH CHECK (public.can_edit_circle(circle_id));
CREATE POLICY "Members can delete circle checklists" ON public.circle_checklists
FOR DELETE TO authenticated USING (public.can_edit_circle(circle_id));

CREATE TABLE public.circle_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_checklist_id uuid NOT NULL REFERENCES public.circle_checklists(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  help_text text,
  link_url text,
  is_done boolean NOT NULL DEFAULT false,
  done_by uuid,
  done_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX circle_checklist_items_parent_idx ON public.circle_checklist_items (circle_checklist_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_checklist_items TO authenticated;
GRANT ALL ON public.circle_checklist_items TO service_role;
ALTER TABLE public.circle_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.checklist_circle_id(_checklist_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT circle_id FROM public.circle_checklists WHERE id = _checklist_id;
$$;

CREATE POLICY "Members can read checklist items" ON public.circle_checklist_items
FOR SELECT TO authenticated
USING (public.is_circle_member(public.checklist_circle_id(circle_checklist_id)));
CREATE POLICY "Members can add checklist items" ON public.circle_checklist_items
FOR INSERT TO authenticated
WITH CHECK (public.can_edit_circle(public.checklist_circle_id(circle_checklist_id)));
CREATE POLICY "Members can update checklist items" ON public.circle_checklist_items
FOR UPDATE TO authenticated
USING (public.can_edit_circle(public.checklist_circle_id(circle_checklist_id)))
WITH CHECK (public.can_edit_circle(public.checklist_circle_id(circle_checklist_id)));
CREATE POLICY "Members can delete checklist items" ON public.circle_checklist_items
FOR DELETE TO authenticated
USING (public.can_edit_circle(public.checklist_circle_id(circle_checklist_id)));

-- Seed templates (placeholder wording, to be reviewed)
INSERT INTO public.checklist_templates (id, title, description, category) VALUES
('11111111-1111-4111-8111-111111111111', 'First steps when someone becomes seriously ill', 'Placeholder: the first practical things to sort out in the early days.', 'getting started'),
('22222222-2222-4222-8222-222222222222', 'Benefits and financial support to look into', 'Placeholder: money and benefits worth checking as a carer or family.', 'money'),
('33333333-3333-4333-8333-333333333333', 'Setting up Lasting Power of Attorney', 'Placeholder: the steps involved in arranging Lasting Power of Attorney.', 'legal'),
('44444444-4444-4444-8444-444444444444', 'Practical things to organise at home', 'Placeholder: everyday arrangements that make home life easier.', 'at home');

INSERT INTO public.checklist_template_items (template_id, position, title, help_text, link_url) VALUES
('11111111-1111-4111-8111-111111111111', 1, 'Placeholder: note down the main contacts', 'Placeholder help text.', NULL),
('11111111-1111-4111-8111-111111111111', 2, 'Placeholder: ask about an NHS needs assessment', 'Placeholder help text.', 'https://www.nhs.uk/'),
('11111111-1111-4111-8111-111111111111', 3, 'Placeholder: request a carer''s assessment from the council', 'Placeholder help text.', 'https://www.gov.uk/'),
('11111111-1111-4111-8111-111111111111', 4, 'Placeholder: agree who speaks to which services', 'Placeholder help text.', NULL),
('22222222-2222-4222-8222-222222222222', 1, 'Placeholder: check Attendance Allowance', 'Placeholder help text.', 'https://www.gov.uk/attendance-allowance'),
('22222222-2222-4222-8222-222222222222', 2, 'Placeholder: check Carer''s Allowance', 'Placeholder help text.', 'https://www.gov.uk/carers-allowance'),
('22222222-2222-4222-8222-222222222222', 3, 'Placeholder: check Council Tax reductions', 'Placeholder help text.', 'https://www.gov.uk/apply-council-tax-reduction'),
('22222222-2222-4222-8222-222222222222', 4, 'Placeholder: check Pension Credit', 'Placeholder help text.', 'https://www.gov.uk/pension-credit'),
('33333333-3333-4333-8333-333333333333', 1, 'Placeholder: decide which type of power of attorney is needed', 'Placeholder help text.', 'https://www.gov.uk/power-of-attorney'),
('33333333-3333-4333-8333-333333333333', 2, 'Placeholder: choose attorneys and talk it through', 'Placeholder help text.', NULL),
('33333333-3333-4333-8333-333333333333', 3, 'Placeholder: complete and sign the forms', 'Placeholder help text.', 'https://www.gov.uk/power-of-attorney/make-lasting-power-of-attorney'),
('33333333-3333-4333-8333-333333333333', 4, 'Placeholder: register with the Office of the Public Guardian', 'Placeholder help text.', 'https://www.gov.uk/government/organisations/office-of-the-public-guardian'),
('44444444-4444-4444-8444-444444444444', 1, 'Placeholder: look at aids and adaptations at home', 'Placeholder help text.', 'https://www.nhs.uk/conditions/social-care-and-support-guide/'),
('44444444-4444-4444-8444-444444444444', 2, 'Placeholder: sort out repeat prescriptions and deliveries', 'Placeholder help text.', 'https://www.nhs.uk/'),
('44444444-4444-4444-8444-444444444444', 3, 'Placeholder: set up food shopping or meal deliveries', 'Placeholder help text.', NULL),
('44444444-4444-4444-8444-444444444444', 4, 'Placeholder: check the Blue Badge scheme', 'Placeholder help text.', 'https://www.gov.uk/apply-blue-badge');
