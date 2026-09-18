ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_item_type_check;
ALTER TABLE public.notification_log DROP CONSTRAINT IF EXISTS notification_log_reminder_kind_check;

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_item_type_check CHECK (item_type IN ('event', 'task', 'digest', 'test'));

ALTER TABLE public.notification_log
  ADD CONSTRAINT notification_log_reminder_kind_check CHECK (reminder_kind IN ('24h', '1h', 'due', 'digest', 'test'));