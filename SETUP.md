# ComicLife — Setup & API Guide 🚀

Follow these steps to configure your database, storage, and AI services.

---

## 1. Supabase Setup (Database & Storage)

### Step 1: Create a Project
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Note your **Database Password** — you’ll need it for the connection.

### Step 2: Database Schema
Once your project is ready, go to the **SQL Editor** in Supabase and run the following queries to create the necessary tables and RLS policies:

```sql
-- 1. Create Users table (extends auth.users)
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              TEXT,
  avatar_url            TEXT,
  character_description TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Comics table
CREATE TABLE public.comics (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title          TEXT,
  story          TEXT NOT NULL,
  style          TEXT NOT NULL,
  is_draft       BOOLEAN DEFAULT TRUE,
  soundtrack_url TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Panels table
CREATE TABLE public.panels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id     UUID REFERENCES public.comics(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  caption      TEXT,
  prompt       TEXT,
  panel_index  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies (Drop first to avoid "already exists" errors)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users manage own comics" ON public.comics;
DROP POLICY IF EXISTS "Users manage panels via comic" ON public.panels;

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage own comics" ON public.comics USING (auth.uid() = user_id);
CREATE POLICY "Users manage panels via comic" ON public.panels 
  USING (EXISTS (SELECT 1 FROM public.comics WHERE id = panels.comic_id AND user_id = auth.uid()));
```

### Step 3: Create Storage Buckets
Go to **Storage** in the Supabase sidebar and create two **Public** buckets:
1. `avatars`: For user profile photos.
2. `panels`: For generated comic panels.

### Step 4: Disable Email Verification (Local Development)
To skip email confirmation while working on localhost:
1. Go to **Authentication -> Settings**.
2. Scroll to **Sign In / Up**.
3. Toggle **Confirm email** to **OFF**.
4. Click **Save**.

---

## 2. Google AI Setup (Gemini & Imagen)

1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API Key** and create a new key.
3. **Important:** To use **Imagen 3** (Image Generation), you must have billing enabled in your Google Cloud Project or be in a region that supports the Imagen API via AI Studio.
4. Copy the key and paste it as `GEMINI_API_KEY` in `.env.local`.

---

## 3. Spotify Setup (Optional)

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create a new App.
3. In the App settings, copy your **Client ID** and **Client Secret**.
4. Add these to your `.env.local` to enable the soundtrack search feature.

---

## 4. Finalizing Environment Variables

In your Supabase project, go to **Settings > API**:
1. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
2. Copy the **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Copy the **service_role** key (hidden by default) → `SUPABASE_SERVICE_ROLE_KEY`

---

## 5. Running the App

Once your `.env.local` is fully filled:

```bash
npm run dev
```

Your ComicLife instance is now fully connected! 🎨📖
