-- PostgREST upsert writes the id column too; RLS already pins it to auth.uid().
GRANT UPDATE (id) ON public.profiles TO authenticated;
