# RLS (Row-Level Security) — Reference for ComicLife

This is a quick-reference guide for how Row-Level Security works, the types of policies, how Supabase layers them, and exactly which policies exist in this project.

---

## 1. What is RLS?

**Row-Level Security** is a Postgres feature that filters which rows a query can read or modify, based on the role making the request. It runs **inside the database** — not in application code — so once a policy is in place, it cannot be bypassed by a buggy API route or a misconfigured client (with one exception, see *Service role* below).

Without RLS:
```
Client query → DB returns whatever matches the WHERE clause
```

With RLS:
```
Client query → RLS rewrites it → DB returns only rows the user is allowed to see
```

### Two states per table

A table is in one of two RLS states:

| State | Behavior |
|---|---|
| **RLS disabled** | All requests can read/write everything. RLS is off. |
| **RLS enabled, no policies** | All requests are **denied by default** (except service_role). Nothing works. |
| **RLS enabled, with policies** | Only requests matching at least one policy are allowed. |

> Enabling RLS without writing policies effectively turns the table off for users.

---

## 2. Anatomy of a policy

```sql
CREATE POLICY "policy_name"
ON public.table_name              -- the table
FOR { ALL | SELECT | INSERT | UPDATE | DELETE }   -- which command(s)
TO { public | authenticated | anon | role_name }  -- which role
USING (boolean_expression)        -- filter for existing rows
WITH CHECK (boolean_expression);  -- filter for new/modified rows
```

### What each part does

- **Name** — any string. Just for humans.
- **Table** — what the policy guards.
- **Command** — when the policy fires (read vs write vs both).
- **Role** — *who* this policy applies to. Everyone goes through `public` first, then authenticated users get the `authenticated` role too.
- **`USING`** — filter for rows that *already exist*. Used for SELECT, UPDATE, DELETE.
- **`WITH CHECK`** — filter for rows being *created or modified*. Used for INSERT and the new state of UPDATE.

### USING vs WITH CHECK — when each applies

| Command | USING | WITH CHECK |
|---|---|---|
| SELECT | ✅ filters readable rows | — |
| INSERT | — | ✅ rejects rows that don't pass |
| UPDATE | ✅ which rows can be touched | ✅ what the new state can be |
| DELETE | ✅ which rows can be removed | — |
| ALL | ✅ for reads/deletes | ✅ for writes (falls back to `USING` if not specified) |

> For an `ALL` policy, if you omit `WITH CHECK`, Postgres reuses the `USING` expression for write checks.

---

## 3. Types of policies — by command

You can have **multiple policies on the same table**. They're combined with `OR` per command — if any policy lets the row through, it's allowed.

### `FOR ALL`
One policy covers SELECT, INSERT, UPDATE, DELETE. Concise.

### `FOR SELECT` / `INSERT` / `UPDATE` / `DELETE`
One policy per command. More explicit; useful when reads and writes need different rules (e.g. anyone can SELECT, only owner can UPDATE).

**Example — split policies:**
```sql
-- Anyone authenticated can read profiles
CREATE POLICY "profiles read" ON users FOR SELECT TO authenticated
USING (true);

-- Only the owner can edit
CREATE POLICY "profiles edit" ON users FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

### `PERMISSIVE` vs `RESTRICTIVE`
By default policies are **PERMISSIVE** — combined with `OR`. You can mark a policy as `RESTRICTIVE` so it must *also* pass (`AND`). Rarely used in app code; useful for adding kill-switches.

---

## 4. RLS in Supabase

Supabase layers a few concepts on top of plain Postgres RLS. They look similar but govern different things.

### Layer A — Table policies (regular RLS)
- **Where:** Dashboard → Authentication → Policies, or Database → Tables → click table → Policies
- **What:** governs `supabase.from('table_name')...` calls
- **Storage location:** the policies live on your application tables (`public.comics`, etc.)

### Layer B — Storage / bucket policies
- **Where:** Dashboard → Storage → click bucket → Policies, or Database → Tables → `storage.objects` → Policies
- **What:** governs `supabase.storage.from('bucket').upload/download/list/remove(...)`
- **Storage location:** under the hood, files are tracked in a system table called `storage.objects`. Each row = one file. Policies filter by `bucket_id` and `name` (the file path).
- **Helper functions:** Supabase provides `storage.foldername(name)` (returns text[] of path segments) and `storage.filename(name)` to use in expressions.

### Layer C — "Public bucket" toggle (NOT a policy)
- **Where:** Dashboard → Storage → bucket → Settings → "Public bucket"
- **What:** controls whether files can be served via a plain `https://....supabase.co/storage/v1/object/public/...` URL
- **Independent of RLS:** the toggle only affects URL-based reads (e.g. `<img src>` tags). It does **not** affect uploads, deletes, or programmatic operations — those still go through RLS policies.

### Common confusion: `TO public` ≠ "public access"

In `CREATE POLICY ... TO public`, the word `public` is the **Postgres role name** — every request, including anonymous ones, comes in as `public`. It just means "this rule applies to everyone." The actual access scope is determined by the `USING` / `WITH CHECK` expressions.

### Helper: `auth.uid()`

Supabase provides `auth.uid()` — a function that returns the JWT subject (the logged-in user's UUID). Returns `NULL` for unauthenticated requests, so any expression like `auth.uid() = user_id` automatically rejects anon access.

### The service_role escape hatch

Supabase ships with two API keys:

| Key | Role | RLS? |
|---|---|---|
| `anon` key | `anon` (or `authenticated` if a JWT is attached) | ✅ enforced |
| `service_role` key | `service_role` | ❌ **bypassed entirely** |

Calls made with `service_role` skip every policy. In this project that's `createAdminSupabaseClient()` — useful for legitimate server-only operations (storage uploads when buckets have no policies, system maintenance), dangerous if used to act on user-supplied input without first verifying ownership in code.

---

## 5. Policies in this project

### Tables (all RLS-enabled, all correct ✅)

| Table | Policy | Expression |
|---|---|---|
| `users` | 3 policies (SELECT/INSERT/UPDATE) | `auth.uid() = id` — user can read/write only their own profile row |
| `comics` | "Users manage own comics" / ALL | `auth.uid() = user_id` |
| `panels` | (one policy) | `EXISTS (SELECT 1 FROM comics WHERE comics.id = panels.comic_id AND comics.user_id = auth.uid())` — scoped through the parent comic |
| `characters` | "Users manage own characters" / ALL | (assumed) `auth.uid() = user_id` |
| `film_plans` | "film_plans owner access" / ALL | scoped to owner via `user_id` |

**What this gives us:** a user can only see and modify their own comics, panels, characters, profile, and film plans. Cross-user access is impossible at the database level — *as long as code uses the server client (`createServerSupabaseClient()`)*.

### Storage buckets (no policies yet ⏳)

The buckets used by this project:

| Bucket | Path layout | Currently |
|---|---|---|
| `avatars` | `avatars/{user_id}.webp`, `cast/{user_id}/{char_id}.webp` | no policies — only `service_role` can write |
| `panels` | `panels/{comic_id}/{n}.webp`, `keyframes/...`, `shots/...`, `films/...`, `audio/...` | no policies — only `service_role` |
| `characters` | `{char_id}.webp` | no policies — only `service_role` |
| `animations` | `animations/{comic_id}/{panel_id}.mp4` | no policies — only `service_role` |

**What this means today:** every storage operation in the API routes uses `createAdminSupabaseClient()`. That's not insecure on its own (anon can't write directly), but it means:
1. The admin client is the only path to storage — if a route uses it without an ownership check first, exploitable
2. Any future direct-from-client uploads won't work without policies

**Fix:** add a `storage-policies.sql` migration alongside [`../supabase/rls.sql`](../supabase/rls.sql) and apply it via Supabase Dashboard → SQL Editor → New query → Run. After that, the storage operations in the routes can be swapped from `admin.storage` → `supabase.storage`.

---

## 6. Common pitfalls

### Pitfall 1 — RLS doesn't run on `service_role`
Writing perfect policies and then using `createAdminSupabaseClient()` for everything defeats the purpose. RLS is only a safety net if the request actually goes through it.

### Pitfall 2 — RLS enabled + no policies = total deny
Forgetting to write a policy after enabling RLS makes the table effectively read-only-for-no-one. The error you see is *"new row violates row-level security policy"* or simply zero rows returned.

### Pitfall 3 — `WITH CHECK` is not the same as `USING`
A policy that only has `USING` will let users **read** their own rows but might still let them **write** with arbitrary values, depending on the command. For `ALL` policies, Postgres falls back to `USING` for writes — which is usually what you want, but not always.

### Pitfall 4 — Forgetting to enable RLS on a new table
By default, new tables have RLS *disabled*. You must enable it with `ALTER TABLE x ENABLE ROW LEVEL SECURITY`. Supabase's table editor shows a shield icon you can toggle.

### Pitfall 5 — Storage policies are written on `storage.objects`, not on the bucket
There's no `storage.buckets` policy syntax. All storage RLS targets `storage.objects` and filters by `bucket_id` in the policy expression. This catches a lot of people.

### Pitfall 6 — `TO public` doesn't mean "publicly accessible"
It's the Postgres role. The actual access is whatever the `USING` expression evaluates to.

---

## 7. Audit checklist

Before shipping or after schema changes, verify:

- [ ] Every user-owned table has RLS **enabled**
- [ ] Every user-owned table has at least one policy (otherwise nothing works)
- [ ] Policy expressions reference `auth.uid()` (or join through to `auth.uid()`)
- [ ] No API route operating on user data uses `createAdminSupabaseClient()` without first verifying ownership via the server client
- [ ] Storage buckets either have policies, or every storage call is preceded by an explicit ownership check
- [ ] Anon access is intentional where it exists (e.g. public reads on avatars)

---

## See also

- [`../supabase/rls.sql`](../supabase/rls.sql) — the table schema + RLS policies applied to this project
- [`security-review.md`](./security-review.md) — outstanding security issues (rate limits, service-role usage, public buckets)
- Supabase docs: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Postgres docs: <https://www.postgresql.org/docs/current/sql-createpolicy.html>
