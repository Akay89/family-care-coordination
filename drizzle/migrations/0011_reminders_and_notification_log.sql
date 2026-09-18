ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS event_reminder_24h boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event_reminder_1h boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS task_due_reminder boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS digest_hour integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS quiet_hours_start integer NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS quiet_hours_end integer NOT NULL DEFAULT 7;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_digest_hour_check CHECK (digest_hour BETWEEN 0 AND 23),
  ADD CONSTRAINT notification_preferences_quiet_start_check CHECK (quiet_hours_start BETWEEN 0 AND 23),
  ADD CONSTRAINT notification_preferences_quiet_end_check CHECK (quiet_hours_end BETWEEN 0 AND 23);

CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('event', 'task', 'digest')),
  item_id uuid,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('24h', '1h', 'due', 'digest')),
  scheduled_for timestamptz NOT NULL,
  scheduled_date date NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'skipped' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX notification_log_once_idx ON public.notification_log (
  user_id,
  item_type,
  COALESCE(item_id, '00000000-0000-0000-0000-000000000000'::uuid),
  reminder_kind,
  scheduled_date
);

CREATE INDEX notification_log_user_idx ON public.notification_log (user_id, created_at DESC);

GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notification log"
  ON public.notification_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());