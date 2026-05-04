# ComicLife — Documentation

This folder is the home for all written documentation. The root [`../README.md`](../README.md) is the project front page; everything deeper than an overview lives here.

## Index

| Doc | What it covers |
|---|---|
| [`setup.md`](./setup.md) | Local setup: Supabase project, schema, storage buckets, Gemini key, Spotify, environment variables. |
| [`guidebook.md`](./guidebook.md) | Build guidebook: design system, page architecture, AI pipeline, API routes, component breakdown. |
| [`pipeline-adjustment.md`](./pipeline-adjustment.md) | History of the avatar-as-reference image switch (Gemini Vision description → direct photo reference). |
| [`security-review.md`](./security-review.md) | Critical security findings, current status, and recommended fix order. |
| [`rls.md`](./rls.md) | Row-Level Security reference for the Supabase schema and storage buckets. |
| [`aws-serverless-low-idle-cost-strategy.md`](./aws-serverless-low-idle-cost-strategy.md) | AWS migration plan optimized for near-zero idle cost. |

## Related files

- [`../supabase/rls.sql`](../supabase/rls.sql) — canonical schema + RLS migration. Apply this in the Supabase SQL Editor.
- [`../README.md`](../README.md) — project front page.
