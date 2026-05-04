-- ============================================================================
-- ComicLife — Schema + Row Level Security
--
-- Apply by pasting this whole file into Supabase SQL Editor and running it.
-- It is idempotent: safe to re-run. Uses CREATE TABLE IF NOT EXISTS,
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS, and DROP POLICY IF EXISTS.
--
-- Design notes:
--   * Server routes that use createAdminSupabaseClient() (service-role key)
--     bypass RLS entirely. RLS here protects:
--       (a) routes that use createServerSupabaseClient() (user-scoped JWT)
--       (b) any future client-side reads/writes via the anon key
--   * Storage policies are intentionally NOT included — buckets are still
--     `Public` per SETUP.md, server uses the admin client for storage I/O,
--     and tightening storage now would not block leaks (URLs are public)
--     while it could break legitimate flows. Make buckets private first,
--     then add storage policies in a separate migration.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Tables (create-if-missing) and column backfills
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              TEXT,
  avatar_url            TEXT,
  character_description TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username              TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name             TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url            TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS character_description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.comics (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title          TEXT,
  story          TEXT NOT NULL,
  style          TEXT NOT NULL,
  is_draft       BOOLEAN DEFAULT TRUE,
  cover_url      TEXT,
  soundtrack_url TEXT,
  film_url       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS title          TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS cover_url      TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS soundtrack_url TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS film_url       TEXT;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS is_draft       BOOLEAN DEFAULT TRUE;
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.comics ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS comics_user_id_idx ON public.comics(user_id);

CREATE TABLE IF NOT EXISTS public.panels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id     UUID REFERENCES public.comics(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  caption      TEXT,
  bubbles      JSONB,
  prompt       TEXT,
  panel_index  INTEGER NOT NULL,
  video_url    TEXT,
  video_status TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS caption      TEXT;
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS bubbles      JSONB;
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS prompt       TEXT;
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS panel_index  INTEGER;
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS video_url    TEXT;
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS video_status TEXT;
ALTER TABLE public.panels ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS panels_comic_id_idx ON public.panels(comic_id);

CREATE TABLE IF NOT EXISTS public.characters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS characters_user_id_idx ON public.characters(user_id);

CREATE TABLE IF NOT EXISTS public.film_plans (
  comic_id        UUID PRIMARY KEY REFERENCES public.comics(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shot_list       JSONB,
  audio           JSONB,
  final_video_url TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS film_plans_user_id_idx ON public.film_plans(user_id);


-- ---------------------------------------------------------------------------
-- 2. Enable RLS on every user-data table
-- ---------------------------------------------------------------------------

ALTER TABLE public.users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.film_plans ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 3. Drop any pre-existing policies so this script is fully idempotent
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own profile"   ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

DROP POLICY IF EXISTS "Users manage own comics" ON public.comics;
DROP POLICY IF EXISTS "Users select own comics" ON public.comics;
DROP POLICY IF EXISTS "Users insert own comics" ON public.comics;
DROP POLICY IF EXISTS "Users update own comics" ON public.comics;
DROP POLICY IF EXISTS "Users delete own comics" ON public.comics;

DROP POLICY IF EXISTS "Users manage panels via comic" ON public.panels;
DROP POLICY IF EXISTS "Users select panels via comic" ON public.panels;
DROP POLICY IF EXISTS "Users insert panels via comic" ON public.panels;
DROP POLICY IF EXISTS "Users update panels via comic" ON public.panels;
DROP POLICY IF EXISTS "Users delete panels via comic" ON public.panels;

DROP POLICY IF EXISTS "Users manage own characters" ON public.characters;
DROP POLICY IF EXISTS "Users manage own film plans" ON public.film_plans;


-- ---------------------------------------------------------------------------
-- 4. users — own profile only
--    INSERT covers the upload-avatar upsert path when no profile row exists.
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 5. comics — split per command so INSERT has an explicit WITH CHECK
-- ---------------------------------------------------------------------------

CREATE POLICY "Users select own comics"
  ON public.comics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own comics"
  ON public.comics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own comics"
  ON public.comics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own comics"
  ON public.comics FOR DELETE
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 6. panels — gated through parent-comic ownership (panels has no user_id)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users select panels via comic"
  ON public.panels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comics c
      WHERE c.id = panels.comic_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert panels via comic"
  ON public.panels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comics c
      WHERE c.id = panels.comic_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update panels via comic"
  ON public.panels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.comics c
      WHERE c.id = panels.comic_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comics c
      WHERE c.id = panels.comic_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete panels via comic"
  ON public.panels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.comics c
      WHERE c.id = panels.comic_id AND c.user_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 7. characters — own rows (FOR ALL covers select/insert/update/delete)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users manage own characters"
  ON public.characters
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 8. film_plans — own rows
-- ---------------------------------------------------------------------------

CREATE POLICY "Users manage own film plans"
  ON public.film_plans
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 9. Force RLS even for table owners, and lock down anon/public grants.
--    service_role has BYPASSRLS, so admin-client routes are unaffected.
-- ---------------------------------------------------------------------------

ALTER TABLE public.users      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.comics     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.panels     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.characters FORCE ROW LEVEL SECURITY;
ALTER TABLE public.film_plans FORCE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.users,
  public.comics,
  public.panels,
  public.characters,
  public.film_plans
FROM anon, public;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.users,
  public.comics,
  public.panels,
  public.characters,
  public.film_plans
TO authenticated;


-- ---------------------------------------------------------------------------
-- 10. Sanity checks (read-only — comment out if Editor complains)
-- ---------------------------------------------------------------------------

-- Confirm RLS is enabled on every protected table:
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN ('users','comics','panels','characters','film_plans')
--   AND relnamespace = 'public'::regnamespace;

-- List all policies:
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
