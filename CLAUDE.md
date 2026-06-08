# CLAUDE.md — DocFlow

Guidance for working in this repository (read this first).

## Project overview

**DocFlow** is a small full-stack collaborative document editor — a lightweight,
Google-Docs-style tool built for a technical exam. It demonstrates four core
capabilities:

1. **Document creation & rich-text editing** — create, rename, edit, save, and reopen
   documents with bold, italic, underline, headings, and bulleted/numbered lists.
2. **File upload** — upload a `.txt`, `.md`, or `.docx` file and turn it into a new
   editable document.
3. **Sharing** — a document owner can grant another user view or edit access, with a
   clear distinction between owned documents and documents shared with you.
4. **Persistence** — documents and sharing data are stored in Supabase (Postgres) and
   survive refreshes.

## Tech stack

| Layer    | Choice                                                        |
| -------- | ------------------------------------------------------------- |
| Frontend | React 18 + TypeScript, Vite, React Router, TipTap (editor)    |
| Backend  | Node + Express + TypeScript (run via `tsx`)                   |
| Database | Supabase (Postgres) accessed with `@supabase/supabase-js`     |
| Monorepo | npm workspaces (`packages/*`, `apps/*`)                        |

## Repository layout

```
.
├── apps/
│   ├── api/        # Express + TS backend (port 4000)
│   └── web/        # React + TS frontend (Vite, port 5173)
├── packages/
│   └── shared/     # Shared TypeScript types (no runtime; import with `import type`)
├── supabase/
│   └── schema.sql  # DB schema + seed users — run in the Supabase SQL editor
├── package.json    # workspaces + root scripts (`npm run dev` runs both apps)
└── README.md       # setup + run instructions
```

## Architecture & conventions

- **Auth is intentionally lightweight.** Users are seeded in the DB. The frontend
  "logs in" by looking a user up by email and storing it in `localStorage`, then sends
  the user id in an `x-user-id` header on every request. The backend's `requireUser`
  middleware ([apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts)) loads
  that user. No passwords/tokens — this keeps scope small for the exam.
- **All access control lives in the API layer.** The backend uses the Supabase
  **service role key** (server-side only — never sent to the browser) and bypasses RLS.
  RLS is intentionally left off. Access checks live in
  [apps/api/src/lib/access.ts](apps/api/src/lib/access.ts) (`getDocumentAccess`,
  `canWrite`) and are applied in each route.
- **The frontend never talks to Supabase directly.** It calls the Express API via the
  Vite dev proxy (`/api` → `http://localhost:4000`). The single API client is
  [apps/web/src/api/client.ts](apps/web/src/api/client.ts).
- **Document content is stored as TipTap HTML** in the `documents.content` column.
  Uploaded files are parsed to HTML server-side
  ([apps/api/src/lib/parseFile.ts](apps/api/src/lib/parseFile.ts)) and the raw file is
  not persisted.
- **Shared types** live in `@docflow/shared` and are imported with `import type` so they
  are erased at build time (no bundling of the workspace package needed).

## Common commands

```bash
npm install          # install all workspaces (run at repo root)
npm run dev          # run API (:4000) and web (:5173) together
npm run dev:api      # API only
npm run dev:web      # web only
npm run typecheck    # type-check both apps
npm run build        # production build of the web app
```

## Environment

- Copy `apps/api/.env.example` → `apps/api/.env` and fill in `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`. The API will refuse to start without them.
- The web app needs no env vars in dev (it proxies `/api`).

## Conventions for changes

- Keep all DB access on the server. Don't add a Supabase client to the frontend.
- When adding an endpoint that touches a document, reuse `getDocumentAccess` /
  `canWrite` rather than re-implementing permission checks.
- Add/adjust shared request/response shapes in `packages/shared/src/index.ts` so both
  sides stay in sync.
- ESM throughout: backend imports use explicit `.js` extensions (e.g. `./supabase.js`)
  because the API runs as ESM via `tsx`.
- Supported upload types are `.txt`, `.md`, `.docx`. If you change this, update the
  `accept` attribute in [apps/web/src/pages/Dashboard.tsx](apps/web/src/pages/Dashboard.tsx),
  the parser in `parseFile.ts`, and the README.
