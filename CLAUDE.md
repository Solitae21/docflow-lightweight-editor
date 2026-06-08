# CLAUDE.md — DocFlow

Guidance for working in this repository (read this first).

## Project overview

**DocFlow** is a full-stack collaborative document editor — a lightweight, Google-Docs-style
tool built for a technical exam. It demonstrates four core capabilities:

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
│   ├── api/                    # Express + TS backend (port 4000)
│   │   └── src/
│   │       ├── index.ts        # Entry — creates the app and listens
│   │       ├── app.ts          # Builds the Express app (importable for tests)
│   │       ├── supabase.ts     # Single Supabase service-role client
│   │       ├── middleware/
│   │       │   ├── auth.ts            # requireUser — reads x-user-id, attaches req.user
│   │       │   └── documentAccess.ts  # requireAccess(level) — authorizes :id, attaches req.access
│   │       ├── lib/            # Business logic + data access (no Express types)
│   │       │   ├── access.ts   # getDocumentAccess, canWrite
│   │       │   ├── documents.ts# document row queries (list/insert/update/delete/detail)
│   │       │   ├── shares.ts   # share row queries
│   │       │   ├── users.ts    # user row queries
│   │       │   └── parseFile.ts# .txt / .md / .docx → TipTap HTML
│   │       └── routes/         # HTTP layer only (parse → authorize → call lib → respond)
│   │           ├── documents.ts# also nests sharesRouter under /:id/shares
│   │           ├── shares.ts
│   │           └── users.ts
│   └── web/                    # React + TS frontend (Vite, port 5173)
│       └── src/
│           ├── main.tsx        # Entry — React Router root
│           ├── App.tsx         # Shell — routes + header
│           ├── api/
│           │   └── client.ts   # Single typed fetch wrapper (all endpoints)
│           ├── auth/
│           │   └── UserContext.tsx  # Login state + localStorage sync
│           ├── hooks/          # Data-fetching hooks (one per resource)
│           │   ├── useDocuments.ts  # list, create, upload, delete
│           │   └── useDocument.ts   # single doc, save, share ops
│           ├── pages/          # Route-level components (thin — delegate to hooks + components)
│           │   ├── Login.tsx
│           │   ├── Dashboard.tsx
│           │   └── DocumentPage.tsx
│           ├── components/     # Reusable, props-only UI pieces
│           │   ├── Editor.tsx
│           │   ├── Toolbar.tsx
│           │   └── ShareModal.tsx
│           ├── lib/            # Pure helpers with no React dependency
│           │   ├── fontSize.ts # TipTap font-size extension
│           │   ├── initials.ts # name → up-to-two-letter initials
│           │   └── formatDate.ts
│           └── styles.css      # Global stylesheet
├── packages/
│   └── shared/
│       └── src/index.ts        # Shared TS types only — import with `import type`
├── supabase/
│   └── schema.sql              # DB schema + seed users — run in Supabase SQL editor
├── package.json                # Workspaces + root scripts
└── README.md                   # Setup & run instructions
```

## Architecture principles

These principles are non-negotiable for every change made in this repo.

### 1. Strict layering — each layer has one job

**Backend layers (top to bottom):**

```
routes/      HTTP boundary — parse req, authorize, call lib, send res. No supabase.from(…) calls.
lib/         Business logic + data access — the only modules that call supabase.from(…).
             access.ts = authorization; documents/shares/users.ts = row queries; parseFile.ts = pure.
supabase.ts  The shared service-role client instance.
```

A route handler should read like a script: validate → authorize → act → respond. All substance lives in `lib/`. Authorization for `:id` routes is done by the `requireAccess(level)` middleware, which attaches `req.access`.

**Frontend layers:**

```
pages/       Route owner — composes hooks + components. Holds no inline fetch or business logic.
hooks/       Data layer — owns loading/error state, calls api/client.ts, exposes typed state + actions.
components/  Pure UI — accepts props, emits events. Never calls api/client.ts directly.
lib/         Pure helpers — no React imports.
api/client.ts  Network boundary — one method per endpoint, attaches auth header.
```

A page component should be nearly all JSX. A hook should contain no JSX.

### 2. Single responsibility per file

Each module does one thing and names it clearly:
- `access.ts` — document permission logic only
- `parseFile.ts` — file-to-HTML conversion only
- `useDocuments.ts` — document list data only
- `useDocument.ts` — single document data + mutation only

When a file starts doing two unrelated things, split it.

### 3. Centralized access control — never duplicate permission checks

All document access logic lives in [apps/api/src/lib/access.ts](apps/api/src/lib/access.ts).

```ts
getDocumentAccess(documentId, userId)  // → { document, accessLevel } | null
canWrite(accessLevel)                  // → boolean
```

Every route that touches a document calls `getDocumentAccess` first. No route may
re-implement ownership or share checks inline.

### 4. The frontend never talks to Supabase

All data access goes through the Express API. The Vite dev proxy (`/api` → `http://localhost:4000`)
makes this transparent. The single API client is [apps/web/src/api/client.ts](apps/web/src/api/client.ts).
Do not add a Supabase client to the frontend.

### 5. Shared types are the contract between frontend and backend

All request/response shapes live in [packages/shared/src/index.ts](packages/shared/src/index.ts).
When adding or changing an endpoint, update the shared types first, then implement both sides.
Always use `import type` so the package has no runtime footprint.

### 6. Hooks own all async state on the frontend

Data fetching, loading flags, and error state belong in hooks inside `src/hooks/`, not
in page components. A page calls a hook and passes the result into components. This keeps
pages readable and makes data logic independently testable.

### 7. Components are props-only

UI components in `src/components/` must not call `api/client.ts` or read from `UserContext`
(except `App.tsx` and page components which are explicitly allowed to). Pass data down as props
and surface user actions via callback props. This makes components easy to render in isolation.

## Auth model

Auth is intentionally lightweight (exam scope — no passwords):

- Users are seeded in the DB. The frontend "logs in" by looking up a user by email and
  storing the user object in `localStorage` under the key `docflow.user`.
- Every API request carries an `x-user-id` header.
- [apps/api/src/middleware/auth.ts](apps/api/src/middleware/auth.ts) reads that header,
  loads the user from the DB, and attaches it to `req.user`. All authenticated routes
  apply this middleware.

## Common commands

```bash
npm install          # install all workspaces (run at repo root)
npm run dev          # run API (:4000) and web (:5173) together
npm run dev:api      # API only
npm run dev:web      # web only
npm run typecheck    # type-check both apps
npm run build        # production build of the web app
npm test             # run Vitest suites for both apps
```

## Testing

Both apps use **Vitest** (`npm test` at the root, or `-w @docflow/api` / `-w @docflow/web`).
- Backend: `lib/access.ts` and `lib/parseFile.ts` are unit-tested; route authorization is covered by
  supertest tests in `apps/api/src/app.test.ts` (the Supabase client is mocked per-table — no live DB).
  `app.ts` is split from `index.ts` so the app can be imported without binding a port.
- Frontend: pure helpers (`lib/initials.ts`) and the `useDocument` autosave hook are tested with
  jsdom + fake timers.
- Pure logic (no DB/React) is the cheapest to test — prefer adding coverage there first.

## Environment

- Copy `apps/api/.env.example` → `apps/api/.env` and fill in `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY`. The API will refuse to start without them.
- The web app needs no env vars in dev (it proxies `/api`).
- The Supabase service-role key is server-side only — never expose it to the browser.

## Conventions checklist

Before opening a PR, verify:

- [ ] Route handlers contain no `supabase.from(…)` calls — queries live in `lib/`.
- [ ] New document-touching routes authorize via `requireAccess(level)` (which uses `getDocumentAccess`).
- [ ] New/changed endpoint shapes are defined in `packages/shared/src/index.ts`.
- [ ] Frontend data fetching lives in a hook in `src/hooks/`, not in a page component.
- [ ] New components accept props and emit callbacks — no direct API calls inside them.
- [ ] Backend imports use explicit `.js` extensions (ESM via `tsx`), e.g. `./access.js`.
- [ ] Supported upload types (`.txt`, `.md`, `.docx`) are consistent across: the `accept`
      attribute in [apps/web/src/pages/Dashboard.tsx](apps/web/src/pages/Dashboard.tsx),
      the parser in `parseFile.ts`, and the README.
- [ ] `npm run typecheck` and `npm test` both pass.
