# Knowledge Share

An internal AI knowledge workspace for teams that need a role-aware place to store documents, links, policies, wiki pages, and searchable knowledge. The app supports admin, team lead, and team member experiences, with citations, freshness tracking, and RAG-based question answering.

## Highlights

- Role-based login with admin, team lead, and team member access
- Separate Team Workspace and Common Workspace views
- Upload files or add links for indexing
- Searchable knowledge library across allowed workspaces
- Chat experience with retrieved citations and source links
- Freshness, authority, and stale-content awareness
- Analytics for searches, unanswered questions, and stale docs
- Supabase PostgreSQL-ready connection setup
- Demo-safe fallback behavior when the database is temporarily unavailable

## Product Flow

1. A user selects a role on the login page.
2. The dashboard shows role-specific shortcuts and workspace entry points.
3. Admins manage the Common Workspace and can view all knowledge.
4. Team leads manage their assigned team workspace and can add team knowledge.
5. Team members can browse knowledge and use chat across accessible sources.
6. The chat pipeline retrieves relevant chunks, ranks them by authority and freshness, and answers with citations.

## Tech Stack

- Next.js 15 with React 19
- TypeScript
- Tailwind CSS
- PostgreSQL with pgvector
- Node `pg` client
- OpenAI-compatible chat support
- OpenAI or local fallback embeddings
- Tesseract.js OCR
- Sonner toasts and Lucide icons

## Main Areas

- `/login` - role selector entry point
- `/dashboard` - role-aware overview
- `/chat` - citation-backed assistant
- `/library` - searchable knowledge library
- `/workspace/team` - team workspace admin panel
- `/workspace/common` - common workspace admin panel
- `/analytics` - usage, gaps, and stale source insights
- `/settings` - workspace and governance settings

## What The App Does

- Stores source metadata in PostgreSQL
- Extracts and indexes uploaded documents
- Accepts links to wiki pages, docs, and other knowledge sources
- Serves a shared library of all accessible knowledge
- Uses retrieval-augmented generation so answers are grounded in indexed sources
- Prefers team sources for team-specific questions and common sources for general knowledge
- Exposes editable workspace admin screens for uploads, links, members, and resource maintenance

## Repository Layout

```text
src/
  app/              Next.js route pages and API routes
  components/       Reusable UI and workspace/chat components
  lib/              Database, auth, RAG, storage, and helper logic
  worker/           Background ingestion worker
db/
  schema.sql        Database schema and extension setup
scripts/
  seed.ts           Seed script for demo users and workspace data
seed-data/          Sample knowledge source payloads
public/             Static assets
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file from `.env.example`.

For local Postgres:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fms_knowledge
DATABASE_SSL=false
APP_URL=http://localhost:3000
JWT_SECRET=change-me-to-a-long-random-secret
```

For Supabase PostgreSQL:

```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres
DATABASE_SSL=true
APP_URL=http://localhost:3000
JWT_SECRET=change-me-to-a-long-random-secret
```

### 3. Create the database

- Apply `db/schema.sql`
- Make sure `pgvector` is available
- Seed the demo data after the schema is ready

### 4. Seed the app

```bash
npm run seed
```

### 5. Start the app

```bash
npm run dev
```

## Supabase Notes

- Use the direct Supabase connection string for persistent server deployments.
- Use the Supavisor transaction pooler string for serverless or edge deployments.
- SSL is enabled automatically for Supabase hostnames, and you can override it with `DATABASE_SSL`.
- The app uses server-side PostgreSQL queries, so the database connection must be reachable from your runtime.

Official reference:

- [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)

## Demo Roles

- Admin
- Team Lead
- Normal User

These demo roles let you test role-based access without password-based auth.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - production build
- `npm run start` - start the production server
- `npm run seed` - seed demo users, teams, and content
- `npm run worker` - start the ingestion worker
- `npm run db:check` - validate the database connection and schema

## Notes On Fallback Behavior

- The app is designed to keep the UI usable during database outages in demo mode.
- Some resource actions can fall back to a local demo store if the database is unavailable.
- For production, point the app at a healthy Supabase database and treat fallback behavior as a safety net, not the primary persistence layer.

## Troubleshooting

- If the app opens to the wrong screen, check the root route and login redirect flow.
- If uploads or links fail, verify the database connection string and network access to Supabase.
- If chat answers are empty, confirm that sources were uploaded and indexed.
- If freshness or analytics pages are blank, check whether the ingestion worker is running.

## License

MIT

