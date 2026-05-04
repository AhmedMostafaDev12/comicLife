# Security Review

This document summarizes the critical security issues found during onboarding.

## Critical Issues

### 1. Unauthenticated users can trigger expensive AI generation //TODO ✅

Several paid API routes either do not require authentication or continue doing costly work when there is no authenticated user.

- `app/api/generate/route.ts` reads the user but does not reject missing auth before calling Gemini/Imagen.
- `app/api/upload-avatar/route.ts` allows unauthenticated image processing and AI avatar generation.
- `app/api/transcribe/route.ts` has no auth check at all.

Impact: anyone can burn paid Gemini, Imagen, or AssemblyAI usage without an account.

### 2. Cross-user panel animation authorization bug //TODO ✅

`app/api/animate-panel/route.ts` fetches a panel by `panelId` using the Supabase service-role client. It now verifies that the panel's comic belongs to the logged-in user before generating video or updating `video_url`.

The route then generates a video and updates the panel's `video_url`.

Impact: any logged-in user who knows or guesses a `panelId` can animate another user's panel, read or use its prompt/image, and overwrite its video URL.

### 3. Service-role client is used widely //Concrete ownership bugs fixed ✅

`lib/supabase-server.ts` exposes `createAdminSupabaseClient()`, which uses the Supabase service-role key. This bypasses Row Level Security.

Some routes do ownership checks correctly, such as delete, update, and film state routes. The originally flagged routes now have this status:

- `app/api/animate-panel/route.ts` — fixed with a parent-comic ownership check before video generation or panel update.
- `app/api/regenerate-panel/route.ts` — fixed by loading the panel through the user-scoped client and deriving `comic_id` from the database.
- `app/api/generate/route.ts` — fixed by scoping selected characters to `user_id` and moving documented RLS-protected DB writes to the user-scoped client.
- `app/api/upload-avatar/route.ts` — no client-supplied target user ID; profile DB write now uses the user-scoped client, while storage upload still uses admin.
- `app/api/transcribe/route.ts` — stale finding; this route uses the user-scoped client for auth and does not perform service-role DB or storage work.

Remaining structural concern: service-role is still used for storage operations and tables without documented RLS policies, so future changes must keep adding explicit ownership gates before admin reads or writes. The broader reduction of service-role usage remains the long-term hardening task.

### 4. Selected character IDs are not scoped to the current user //TODO ✅

`app/api/generate/route.ts` previously loaded characters with `.in('id', selectedCharacterIds)` using admin access without also filtering by `user_id`. It now adds `.eq('user_id', user.id)`.

Impact: if a user obtains another character ID, they can pull that character's name, description, and avatar into their generation flow.

### 5. Public storage buckets expose user media by URL //Check if this actually happens

[`setup.md`](./setup.md) instructs creating public `avatars` and `panels` buckets. The app stores original avatars, stylized avatars, generated panels, video shots, narration, and final videos with public URLs.

Impact: anyone with the URL can view private diary-derived images or videos. For this app's domain, assume generated media is private unless product requirements explicitly say otherwise.

### 6. No rate limiting or quota enforcement on high-cost routes //TODO

The app has no per-user or per-IP throttling, quota enforcement, request size limits, or job limits for paid/long-running routes such as:

- `/api/generate`
- `/api/upload-avatar`
- `/api/create-character`
- `/api/animate-panel`
- `/api/film/shot`
- `/api/transcribe`

Impact: authenticated or unauthenticated users can drain API spend or overload long-running routes.

## Recommended Fix Order

1. Add auth guards to every paid API route.
2. Add ownership checks before every service-role read or write.
3. Scope all user-owned lookups with `user_id`.
4. Make storage private or use signed URLs for private content.
5. Add rate limits and file/body size limits.
6. Reduce service-role usage. Prefer normal Supabase clients plus RLS where possible.
