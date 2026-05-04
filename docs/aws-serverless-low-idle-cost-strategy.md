# AWS Serverless Low-Idle-Cost Strategy for ComicLife

Last updated: 2026-05-03

## Purpose

ComicLife is currently an MVP with no meaningful user volume. The immediate goal is to keep infrastructure idle cost as close to zero as possible while preserving a path to scale once users start generating comics.

This document defines the AWS architecture we should use if we migrate away from Vercel + Supabase for the lowest possible idle cost.

The core rule is simple:

> Use AWS services that have no monthly baseline charge. Avoid every AWS service that creates an always-on hourly resource.

AI model costs are not included in these estimates. Gemini, OpenAI, Replicate, and AssemblyAI usage will dominate cost once users generate comics.

## Current App Constraints

The current codebase has these hosting-relevant traits:

- Next.js 16 App Router app.
- Server API routes currently depend on Supabase Auth, Supabase Postgres, and Supabase Storage.
- The main generation route uses `maxDuration = 300` and does long synchronous work.
- Generation calls Gemini for story parsing, character sheets, and panel images.
- Generated image panels are stored as WebP blobs.
- Avatar and character uploads use `sharp`, which requires a Node/native runtime.
- Storage is currently URL-oriented and public-bucket oriented.

The AWS architecture must support:

- Node.js runtime.
- Native `sharp`.
- Long AI jobs up to several minutes.
- Private image storage.
- Cheap global image delivery.
- Auth, DB, jobs, and object storage with no fixed monthly floor.

## Recommended AWS Stack

Use this stack:

| Need | AWS Service | Why |
|---|---|---|
| Next.js hosting | SST + OpenNext on AWS Lambda + CloudFront | No always-on server; works with Next.js; scales from zero |
| API routes | AWS Lambda | No cost when idle; supports Node and `sharp` |
| Background jobs | SQS + Lambda workers | No baseline cost; handles long generation asynchronously |
| Database | DynamoDB | No fixed server cost; zero idle cost; scales later |
| Relational database option | Aurora DSQL | SQL/PostgreSQL-wire-protocol option with no hourly idle compute charge |
| Auth | Cognito User Pools | Free up to 10k MAU; no idle cost |
| Image storage | S3 private buckets | No baseline cost; tiny per-GB storage cost |
| Image delivery | CloudFront | 1 TB transfer and 10M requests/month included |
| SSL | ACM non-exportable public cert | Free with integrated AWS services |
| DNS | Keep Cloudflare DNS free | Avoid Route 53 hosted-zone fixed cost |
| Secrets | Lambda environment variables or SSM Parameter Store | No separate service floor for basic use |
| Cost controls | AWS Budgets + Lambda reserved concurrency | Prevent surprise bills |

Do not use RDS, ECS, Fargate, App Runner, NAT Gateway, ALB, ElastiCache, OpenSearch, Route 53, RDS Proxy, VPC endpoints, or AWS WAF during the no-money MVP phase unless we intentionally accept fixed cost.

## Expected Idle Cost

If we deploy the app but have no users and avoid fixed-cost services:

| Resource | Idle cost |
|---|---:|
| Lambda | $0 when not invoked |
| Lambda Function URLs | $0 extra |
| SQS | $0 idle |
| DynamoDB | $0 idle under free-tier/capacity limits |
| Aurora DSQL | $0 compute when idle; storage is free for the first 1 GB/month, then usage-based |
| Cognito | $0 under 10k MAU |
| CloudFront | $0 under free transfer/request allowances |
| ACM public cert | $0 if non-exportable and used with CloudFront |
| CloudWatch Logs | $0 if under 5 GB logs/month |
| S3 | Fractions of a cent for tiny stored assets |
| Cloudflare DNS | $0 |

Realistic idle number:

```text
$0.00/month if there are no stored objects and no requests
~$0.01/month if we have small S3 assets/log remnants
~$0.02/month per GB of stored S3 data
```

The main caveat is S3. S3 has no monthly minimum, but persistent stored bytes are billable after credits/free allowances. At standard us-east pricing, 1 GB stored for a month is roughly a few cents. This is still far below Cloudflare Workers Paid's practical $5/month floor for our current app shape.

Aurora DSQL has a similar caveat if we choose it instead of DynamoDB. There is no hourly compute charge when idle, and the first 1 GB of storage plus the first 100,000 DPUs each month are free. Past that, storage and database activity are metered. This is still compatible with near-zero idle cost, but it is not as hard-capped and predictable as DynamoDB for a no-money MVP.

## AWS Free Tier Caveat

AWS changed the Free Tier program for new accounts in July 2025. New accounts can receive credits for a limited period, and always-free monthly allowances still exist for many services.

Important operational point:

- During the free account period, credits may hide mistakes.
- After the free account period, upgrade to a paid AWS plan if we want resources to keep running.
- The bill can still remain near zero after upgrade if usage stays under always-free allowances and we avoid fixed-cost resources.

Do not treat credits as the architecture. The architecture must be cheap after credits expire.

## Services to Use

### 1. SST + OpenNext

Use SST to deploy the existing Next.js app to AWS using OpenNext.

Why:

- Keeps Next.js instead of rewriting the app.
- Deploys server rendering to Lambda.
- Deploys static assets to S3/CloudFront.
- Avoids managing raw CloudFormation by hand.
- Keeps infrastructure as code in the repo.

Expected repo additions:

```text
sst.config.ts
open-next.config.ts or adapter config if needed
```

Initial deployment target:

```text
Region: us-east-1
Runtime: Node.js 20 or Node.js 22, depending on OpenNext/SST support
Architecture: arm64 where supported
```

Use `arm64` because Lambda on Graviton generally has better price/performance.

### 2. Lambda for Next.js and APIs

Lambda has no idle cost. It is a good fit for the current app because:

- It supports Node.
- `sharp` can run in Lambda.
- Current generation max duration is 300 seconds, and Lambda supports up to 900 seconds.
- It avoids the Cloudflare Workers `sharp` issue.

Recommended Lambda defaults:

| Lambda type | Memory | Timeout | Notes |
|---|---:|---:|---|
| Next.js server renderer | 1024 MB | 30s | Normal page/API traffic |
| Lightweight APIs | 512 MB | 15-30s | Save, update, delete |
| Avatar/character image processing | 1536 MB | 300s | Uses `sharp` + Gemini |
| Comic generation worker | 1536-3008 MB | 900s | Long AI orchestration |

Do not run the full comic generation pipeline as an open HTTP request long term. The current `/api/generate` route should become:

```text
POST /api/generate
  authenticate user
  validate story
  create generation job row
  send SQS message
  return jobId immediately
```

Then the client polls:

```text
GET /api/generate/status?jobId=...
```

This removes the request timeout risk and makes retries/failure cleanup manageable.

### 3. SQS for Jobs

Use SQS Standard queues.

Recommended queues:

```text
comic-generation-queue
comic-generation-dlq
avatar-processing-queue
avatar-processing-dlq
transcription-queue
transcription-dlq
```

Initial settings:

| Setting | Value |
|---|---:|
| Worker Lambda timeout | 900s max |
| SQS visibility timeout | 1000-1200s |
| Max receive count | 2 or 3 |
| DLQ retention | 4-14 days |
| Worker reserved concurrency | 1-3 during MVP |

Reserved concurrency is important. It gives us a hard throttle so a bug or attacker cannot launch hundreds of expensive AI jobs in parallel.

Generation job flow:

```text
User submits story
  -> API validates auth and quotas
  -> Job row created in DynamoDB or Aurora DSQL
  -> SQS message created
  -> Worker claims message
  -> Worker runs Gemini pipeline
  -> Worker uploads panels to S3
  -> Worker writes comics/panels rows to DynamoDB or Aurora DSQL
  -> Worker marks job complete or failed
```

### 4. Database Choice: DynamoDB vs Aurora DSQL

There are two serious database choices for this app on AWS.

| Option | Idle cost | Fit | Recommendation |
|---|---:|---|---|
| DynamoDB | Lowest and most predictable | Best for user-owned documents, job state, panels, and simple access patterns | Use if absolute cost control matters most |
| Aurora DSQL | Near-zero idle, usage-based SQL | Best if we want to keep a relational/SQL mental model | Use if migration simplicity is worth slightly more pricing uncertainty |

The default recommendation is still DynamoDB because the goal is to compete with free Vercel + Supabase during the no-money phase. Aurora DSQL is now a real alternative if preserving SQL matters more than squeezing the last bit of billing predictability.

### 4A. DynamoDB for Database

For the lowest idle cost, prefer DynamoDB over Postgres.

Why:

- No database server running 24/7.
- No fixed monthly floor.
- Good fit for user-owned documents, comics, panels, characters, and job state.
- Scales without operational work.

Recommended initial table model:

Use several simple tables instead of a complex single-table design. Multiple DynamoDB tables do not create a fixed monthly cost, and this keeps the migration easier.

```text
Users
  PK: userId

Comics
  PK: comicId
  GSI1: userId + createdAt

Panels
  PK: comicId
  SK: panelIndex
  GSI1: panelId

Characters
  PK: userId
  SK: characterId

Jobs
  PK: jobId
  GSI1: userId + createdAt
```

Current Supabase mapping:

| Current table | DynamoDB table |
|---|---|
| `users` | `Users` |
| `comics` | `Comics` |
| `panels` | `Panels` |
| `characters` | `Characters` |
| generation state | `Jobs` |

Panel `bubbles` can stay as JSON. DynamoDB supports nested map/list attributes, so this does not require a relational join.

Billing mode recommendation:

```text
MVP no-money mode:
  Use provisioned capacity with very low limits if we want a hard-ish cap.

Early launch mode:
  Use on-demand billing for simpler scaling.
```

Tradeoff:

- Provisioned capacity can stay inside free allowances but can throttle if traffic spikes.
- On-demand is easier and still costs nothing at idle, but request spikes can create small usage charges.

For the first public test, I would use provisioned capacity with conservative autoscaling limits. Once users appear, switch high-traffic tables to on-demand.

### 4B. Aurora DSQL as the Relational Alternative

Aurora DSQL is worth considering because it is PostgreSQL-wire-protocol compatible and has no hourly server charge. It scales compute to zero when idle and charges by database activity, measured in Distributed Processing Units, plus storage.

Why it may be attractive:

- Keeps SQL queries and relational modeling closer to the current Supabase/Postgres schema.
- Avoids a full DynamoDB access-pattern redesign.
- Supports core relational features such as tables, joins, secondary indexes, ACID transactions, inserts, and updates.
- Has a monthly free allowance that should cover development and very small MVP usage.

Why it is not a drop-in Supabase Postgres replacement:

- No foreign key constraints.
- No sequences, triggers, temporary tables, partitions, or PostgreSQL extensions.
- No `PL/pgSQL`, `pgvector`, `pg_stat_statements`, `PGCron`, or PostGIS.
- JSON and JSONB are runtime query types, not normal column types. Store JSON as `text` and cast during queries.
- Authentication uses AWS/IAM-style connection tokens, not long-lived Postgres passwords.
- Some normal Postgres DDL and migration patterns are unsupported or different.

Current Supabase schema implications:

| Current feature | Aurora DSQL impact |
|---|---|
| UUID primary keys | Supported |
| `JSONB` `panels.bubbles` | Store as `text` and parse/cast when needed |
| Foreign key relationships | Enforce in application code |
| RLS policies | Replace with application-level auth checks |
| `gen_random_uuid()` defaults | Generate IDs in app code |
| Supabase Auth user references | Replace with Cognito `sub` user IDs |

If we choose Aurora DSQL, the first schema should be intentionally simple:

```sql
users(id uuid primary key, email text, avatar_key text, created_at timestamptz)
comics(id uuid primary key, user_id uuid, title text, story text, style text, cover_key text, is_draft boolean, created_at timestamptz)
panels(id uuid primary key, comic_id uuid, panel_index integer, image_key text, caption text, bubbles_text text, prompt text, created_at timestamptz)
characters(id uuid primary key, user_id uuid, name text, description text, avatar_key text, created_at timestamptz)
jobs(id uuid primary key, user_id uuid, status text, progress text, error text, created_at timestamptz, updated_at timestamptz)
```

Use Aurora DSQL only if we accept enforcing ownership, referential integrity, and JSON parsing in application code. If that feels like too much custom discipline, DynamoDB is actually more honest because it forces us to model those constraints explicitly.

### 5. Cognito for Auth

Use Cognito User Pools.

Why:

- No idle cost.
- Free allowance is high enough for MVP.
- Avoids paying Clerk/Supabase just for auth.
- Integrates with Lambda/API auth.

Implementation options:

| Option | Recommendation |
|---|---|
| Cognito Hosted UI | Fastest, least custom work |
| Custom login/signup pages using Cognito APIs | Best UX, more implementation work |

Given the current app already has custom login/signup pages, likely path:

```text
Replace Supabase Auth calls with Cognito auth calls.
Store user session in secure HttpOnly cookies.
Verify Cognito JWTs in server routes.
Use Cognito user `sub` as userId.
```

Do not use Cognito Identity Pools unless we need direct browser access to AWS resources. For this app, the browser should not directly write S3, DynamoDB, or Aurora DSQL at first.

### 6. S3 for Private Media Storage

Use private S3 buckets for avatars, character images, and panel images.

Recommended buckets:

```text
comiclife-prod-media
comiclife-prod-assets
```

Object layout:

```text
avatars/{userId}/original.webp
avatars/{userId}/stylized.webp
characters/{userId}/{characterId}/original.webp
characters/{userId}/{characterId}/stylized.webp
panels/{userId}/{comicId}/{panelIndex}.webp
exports/{userId}/{comicId}/comic.pdf
```

Important schema change:

Store S3 object keys in the database, not public URLs.

Bad long-term shape:

```text
image_url = https://public-bucket-url/...
```

Better shape:

```text
imageKey = panels/user_123/comic_456/000.webp
```

Then generate signed URLs when needed, or serve through CloudFront with signed cookies/URLs later.

Initial MVP access pattern:

```text
GET /api/media/signed-url?key=...
  verify user owns object
  return short-lived signed URL
```

Later scale pattern:

```text
CloudFront private distribution
CloudFront Origin Access Control to S3
Signed CloudFront URLs or cookies
```

S3 settings:

- Block all public access.
- Disable bucket ACLs.
- Do not enable versioning initially.
- Add lifecycle cleanup for failed jobs/temp uploads.
- Use SSE-S3 encryption by default.

### 7. CloudFront for Delivery

Use CloudFront in front of:

- The OpenNext app.
- Static assets.
- S3 media, once private media delivery is ready.

Why:

- No fixed monthly fee.
- Large free monthly transfer/request allowance.
- Global performance.
- Lets us keep Cloudflare DNS while using AWS origin services.

CloudFront currently has two relevant free/low-cost models:

| Model | What it means | Use when |
|---|---|---|
| Normal pay-as-you-go free allowance | All CloudFront customers receive a monthly free allowance, historically 1 TB data transfer and 10M HTTP/HTTPS requests | Default choice for our MVP |
| CloudFront flat-rate Free plan | $0/month plan with lower allowances, no overage charges, and bundled features such as WAF/DDoS, TLS, Route 53 DNS, CloudWatch Logs ingestion, and S3 storage credits | Consider for bill safety after confirming account eligibility |

Important nuance: AWS docs say accounts using AWS Free Tier are not eligible for CloudFront flat-rate pricing plans. For the first migration, use normal CloudFront pay-as-you-go with AWS Budgets. Revisit the flat-rate Free or Pro plan after the AWS account/free-tier status is clear.

Do not add AWS WAF yet. WAF is useful later, but it adds fixed/usage costs. During MVP, use app-level rate limits and reserved concurrency first.

### 8. ACM for TLS

Use AWS Certificate Manager public certificates for CloudFront.

Rules:

- Use non-exportable ACM public certificates.
- Do not create ACM Private CA.
- Do not request exportable public certificates.
- For CloudFront, create the ACM cert in `us-east-1`.

This keeps TLS at $0.

### 9. Keep DNS on Cloudflare

Do not use Route 53 during the no-money phase.

Route 53 hosted zones have a small fixed monthly charge. It is not large, but it violates the goal of competing with free Vercel + Supabase.

Use:

```text
Cloudflare DNS -> CNAME/ALIAS to CloudFront
```

Cloudflare DNS can remain free.

## Services to Avoid During No-Money MVP

Avoid these unless we intentionally accept cost:

| Avoid | Why |
|---|---|
| RDS / normal Postgres | Fixed database cost |
| Aurora Serverless v2 | Can scale compute to zero, but storage/I/O/VPC complexity still not the lowest-idle path |
| ECS / Fargate | Running containers cost money |
| App Runner | Has a service floor when running |
| EC2 / Lightsail | Always-on server cost |
| NAT Gateway | Expensive fixed hourly + data processing cost |
| Application Load Balancer | Fixed hourly cost |
| API Gateway | No fixed floor, but unnecessary if Lambda Function URLs/OpenNext wiring works |
| Route 53 | Hosted zone monthly cost |
| ElastiCache / Redis | Fixed node cost |
| OpenSearch | Fixed cluster cost |
| RDS Proxy | Fixed cost |
| VPC endpoints / PrivateLink | Hourly cost |
| EFS | Storage and throughput complexity; avoid unless required |
| AWS WAF | Useful later, but not free |
| ACM Private CA | Very expensive monthly cost |
| Exportable ACM public certs | Charged certificates |
| Step Functions | Useful, but per-state costs and not needed for MVP |
| Lambda Durable Functions as first implementation | Promising, but newer; start with SQS + Lambda unless we specifically need durable waits/checkpoints |

## Cost Guardrails

Set these up on day one.

### 1. AWS Budgets

Create monthly budgets:

```text
$1 actual spend
$5 actual spend
$10 actual spend
$20 actual spend
```

Send alerts to all three founders.

### 2. Lambda Reserved Concurrency

Set reserved concurrency:

```text
comic-generation-worker: 1 initially
avatar-processing-worker: 1 initially
transcription-worker: 1 initially
```

Increase only when we have usage and confidence.

### 3. Per-User Quotas

Store quotas in the database:

```text
free user:
  max 1 active generation job
  max N comics/day
  max N avatar generations/day
  max audio duration
```

Even if infra is cheap, AI calls are not. Quotas matter more than hosting cost.

### 4. SQS DLQs

Every worker queue must have a DLQ. Failed jobs should not retry forever.

### 5. CloudWatch Log Retention

Set log retention:

```text
dev: 3 days
prod MVP: 7-14 days
```

Avoid logging base64 images, full prompts with private diary content, or large request bodies.

### 6. S3 Lifecycle Rules

Add cleanup:

```text
tmp/* -> delete after 1 day
failed-jobs/* -> delete after 7 days
multipart uploads -> abort after 1 day
```

Do not enable S3 versioning until we have a reason.

### 7. AI Spend Controls

Use app-level controls:

- Auth required on every paid route.
- One active generation per user.
- Story length caps.
- Max selected characters.
- Max generated panels.
- Model allowlist.
- Daily/monthly per-user usage counters.
- Admin kill switch for generation.

### 8. CloudFront Billing Mode Check

During initial deployment, explicitly decide which CloudFront billing model is active:

```text
MVP default:
  CloudFront pay-as-you-go + normal free allowance + AWS Budgets

Later bill-safety option:
  CloudFront flat-rate Free or Pro plan, if the account and distribution are eligible
```

Do not assume the flat-rate plan is active just because CloudFront has a free tier. They are separate pricing models.

## Migration Plan

### Phase 1: AWS Skeleton

Add:

```text
sst.config.ts
DynamoDB tables or Aurora DSQL cluster/schema
S3 media bucket
SQS queues + DLQs
Cognito User Pool
OpenNext deployment
CloudFront distribution
```

Deploy a basic app with no data migration yet.

Success criteria:

- App loads through CloudFront.
- Lambda logs are visible.
- S3 bucket is private.
- DynamoDB tables or Aurora DSQL schema exist.
- No fixed-cost services appear in AWS bill.

### Phase 2: Introduce Data Access Layer

Create a repository layer so UI/routes no longer call Supabase directly.

Example:

```text
lib/data/users.ts
lib/data/comics.ts
lib/data/panels.ts
lib/data/characters.ts
lib/data/jobs.ts
lib/storage/media.ts
lib/auth/server.ts
```

This prevents the migration from touching every page repeatedly.

### Phase 3: Move Storage from Supabase Storage to S3

Replace:

```text
adminSupabase.storage.from(...).upload(...)
adminSupabase.storage.from(...).download(...)
getPublicUrl(...)
```

With:

```text
putObject(...)
getObject(...)
createSignedUrl(...)
```

Store object keys, not public URLs.

Success criteria:

- New avatars upload to S3.
- New generated panels upload to S3.
- Media remains private.
- UI can display media via signed URLs.

### Phase 4: Move Auth from Supabase to Cognito

Replace:

```text
supabase.auth.signUp
supabase.auth.signInWithPassword
supabase.auth.getUser
supabase.auth.signOut
```

With Cognito equivalents.

Success criteria:

- Login works.
- Signup works.
- Server routes can verify current user.
- User ID is stable and used in database rows and S3 keys.

### Phase 5: Move DB from Supabase to DynamoDB

Migrate current tables to DynamoDB by default:

```text
users -> Users
comics -> Comics
panels -> Panels
characters -> Characters
```

For pre-user MVP, manual migration is fine. Once there are users, write a one-time migration script.

Success criteria:

- Dashboard lists comics from DynamoDB.
- Read page loads comic + panels from DynamoDB.
- Profile loads characters from DynamoDB.
- Save/update/delete flows work.

Alternative Phase 5: Move DB from Supabase to Aurora DSQL

Use this path only if we decide relational SQL is more important than absolute billing predictability.

Migration adjustments:

- Convert `JSONB` columns to `text` columns for stored JSON.
- Remove foreign key assumptions and enforce ownership in application code.
- Generate UUIDs in application code.
- Replace Supabase RLS with explicit server-side authorization checks.
- Use AWS/IAM connection token flow for database connections.

Success criteria:

- Existing Supabase schema is represented in Aurora DSQL-compatible SQL.
- Every query is scoped by Cognito user ID where appropriate.
- JSON fields round-trip correctly.
- No unsupported Postgres features are used in migrations.

### Phase 6: Convert Generation to Jobs

Replace synchronous generation with job flow:

```text
POST /api/generate -> returns jobId
SQS worker -> generates comic
GET /api/generate/status -> returns status/progress
```

Job states:

```text
queued
enhancing_story
parsing_story
generating_characters
generating_anchor_panel
generating_panels
uploading
complete
failed
cancelled
```

Success criteria:

- User can refresh page without losing generation.
- Failed jobs are visible.
- Partial S3 objects are cleaned up.
- Worker concurrency is capped.

### Phase 7: Cutover

Cutover steps:

1. Deploy AWS prod stack.
2. Verify bill has no fixed-cost resources.
3. Point Cloudflare DNS at CloudFront.
4. Keep old Vercel/Supabase deployment read-only for rollback.
5. Monitor AWS billing daily for the first week.

## Scaling Path Later

This architecture scales without changing the core platform.

### First real users

Keep:

- Lambda
- SQS
- DynamoDB or Aurora DSQL
- S3
- CloudFront
- Cognito

Increase:

- Worker reserved concurrency from 1 to 3-10.
- SQS visibility timeout if generation gets slower.
- DynamoDB tables to on-demand billing if provisioned throttles, or monitor Aurora DSQL DPU/storage usage if using DSQL.

### More image traffic

Keep images in S3 + CloudFront while under CloudFront free/cheap limits.

If egress becomes a real line item:

- Move generated media to Cloudflare R2.
- Keep AWS compute if desired.
- Or migrate fully to Cloudflare once paying $5/month is irrelevant.

### More complex relational needs

If DynamoDB starts fighting the product:

- Consider Aurora DSQL for SQL with no idle compute charge.
- Consider Aurora Serverless v2 only when we accept more AWS database complexity.
- Consider Neon/Supabase Postgres only when paying a managed Postgres bill is acceptable.

Aurora DSQL should be evaluated before Aurora Serverless v2 because DSQL has no provisioned database instance and can stay much closer to the near-zero idle-cost goal. Aurora Serverless v2 is more PostgreSQL-compatible in practice, but it has more database/VPC complexity and is not the cheapest idle path.

### More durable orchestration

If generation logic becomes more complex than a simple queue worker, evaluate Lambda Durable Functions.

Potential fit:

- Multi-step generation pipeline.
- Built-in checkpoints.
- Retryable steps.
- Waiting on external AI/transcription providers without paying compute while suspended.
- Workflows that need to survive longer than the normal 15-minute Lambda limit.

Default remains SQS + Lambda worker for the first migration because it is straightforward, cheap, and enough for the current pipeline.

### More security needs

When revenue/users justify it:

- Add AWS WAF in front of CloudFront.
- Add CloudFront signed cookies for media.
- Add more structured monitoring.
- Add centralized audit logs.

## Architecture Diagram

```text
Browser
  |
  | Cloudflare DNS (free)
  v
CloudFront
  |
  +--> OpenNext / Lambda Function URL
  |      |
  |      +--> Cognito JWT verification
  |      +--> DynamoDB or Aurora DSQL
  |      +--> S3 signed URLs
  |      +--> SQS enqueue
  |
  +--> S3 static assets
  |
  +--> S3 media objects via private access pattern

SQS
  |
  v
Lambda workers
  |
  +--> Gemini / OpenAI / AssemblyAI
  +--> S3 media uploads
  +--> DynamoDB or Aurora DSQL job/comic/panel updates
  +--> DLQ on repeated failure
```

## Final Recommendation

For the current no-money stage, use AWS serverless because it can idle at effectively zero.

The recommended first implementation is:

```text
SST + OpenNext
Lambda
SQS
DynamoDB
Cognito
S3
CloudFront
ACM
Cloudflare DNS
```

If the team strongly prefers SQL, substitute Aurora DSQL for DynamoDB:

```text
SST + OpenNext
Lambda
SQS
Aurora DSQL
Cognito
S3
CloudFront
ACM
Cloudflare DNS
```

That is still a near-zero-idle AWS stack, but it comes with PostgreSQL compatibility limits and more pricing uncertainty than DynamoDB.

The two most important rules:

1. Do not introduce fixed-cost AWS services.
2. Convert expensive AI work into queued jobs with strict concurrency and per-user quotas.

If we follow those rules, AWS gives us the lowest possible idle cost now and a credible scale path later.

## Pricing References

- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/
- Lambda Function URLs: https://aws.amazon.com/about-aws/whats-new/2022/04/aws-lambda-function-urls-built-in-https-endpoints/
- Lambda Durable Functions: https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html
- Amazon SQS pricing: https://aws.amazon.com/sqs/pricing/
- Amazon DynamoDB introduction/pricing notes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- Amazon Aurora DSQL pricing: https://aws.amazon.com/rds/aurora/dsql/pricing/
- Aurora DSQL PostgreSQL compatibility limits: https://docs.aws.amazon.com/aurora-dsql/latest/userguide/working-with-postgresql-compatibility-unsupported-features.html
- Aurora DSQL supported data types: https://docs.aws.amazon.com/aurora-dsql/latest/userguide/working-with-postgresql-compatibility-supported-data-types.html
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Amazon CloudFront FAQ/free tier: https://aws.amazon.com/cloudfront/faqs
- CloudFront flat-rate pricing plans: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html
- Amazon Cognito pricing: https://aws.amazon.com/cognito/pricing/
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- AWS Certificate Manager pricing: https://aws.amazon.com/certificate-manager/pricing/
- Amazon Route 53 pricing: https://aws.amazon.com/route53/pricing/
- AWS Free Tier 2025 update: https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits/
- SST Next.js on AWS: https://sst.dev/docs/component/aws/nextjs
- OpenNext AWS docs: https://opennext.js.org/aws/get_started
