# DocFlow

A small full-stack collaborative document editor — a lightweight, Google-Docs-style
tool. Create and edit rich-text documents in the browser, import files, share with
other users, and have everything persist in a database.

Built with **React + TypeScript** (frontend), **Node + Express + TypeScript** (backend),
and **Supabase / Postgres** (database), organized as an **npm-workspaces monorepo**.

---

## Features

- **Document creation & editing** — create a document, rename it, and edit it in the
  browser with rich-text formatting: **bold**, *italic*, <u>underline</u>, headings
  (H1/H2), and bulleted/numbered lists. Powered by [TipTap](https://tiptap.dev/).
- **Autosave & reopen** — changes save automatically (debounced) and persist across
  refreshes.
- **File upload** — upload a file and turn it into a new editable document.
  **Supported types: `.txt`, `.md`, `.docx`.** Other types are rejected with a clear
  message. (`.docx` is converted via [mammoth](https://github.com/mwilliamson/mammoth.js),
  `.md` via [marked](https://marked.js.org/).)
- **Sharing** — every document has an owner. The owner can grant another user
  **view** or **edit** access. The dashboard clearly separates **My Documents** from
  **Shared with me**, and view-only documents open in read-only mode.
- **Persistence** — documents and shares are stored in Supabase (Postgres).

---

## Prerequisites

- **Node.js 18+** and npm
- A **Supabase** project (free tier is fine)

---

## Local Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd docflow
```

### 2. Install dependencies

From the repository root:

```bash
npm install
```

This installs all three workspaces (`apps/api`, `apps/web`, `packages/shared`) in one step.

### 3. Create the database schema

In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the `users`,
`documents`, and `document_shares` tables and seeds three demo users:

| Name  | Email               |
| ----- | ------------------- |
| Alice | `alice@example.com` |
| Bob   | `bob@example.com`   |
| Carol | `carol@example.com` |

> The script drops the DocFlow tables first, so it is safe to re-run to reset state.

### 4. Configure the backend environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and set the two required values (found in **Supabase → Project Settings → API**):

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
```

> Use the **service role** key. It is used only on the server and is never exposed to
> the browser. The frontend needs no environment variables in development.

### 5. Start the development servers

```bash
npm run dev
```

This starts both servers concurrently:

| Server  | URL                         |
| ------- | --------------------------- |
| API     | http://localhost:4000       |
| Web app | http://localhost:5173       |

Open **http://localhost:5173** and sign in by picking a seeded account.

---

## Project Structure

```
.
├── apps/
│   ├── api/                          # Express + TypeScript backend (port 4000)
│   │   └── src/
│   │       ├── index.ts              # Entry point — creates the app and listens
│   │       ├── app.ts                # Builds the Express app (importable for tests)
│   │       ├── app.test.ts           # Supertest route authorization tests
│   │       ├── supabase.ts           # Single Supabase service-role client
│   │       ├── middleware/
│   │       │   ├── auth.ts           # requireUser — reads x-user-id, attaches req.user
│   │       │   └── documentAccess.ts # requireAccess(level) — authorizes :id routes
│   │       ├── lib/                  # Business logic + data access (no Express types)
│   │       │   ├── access.ts         # getDocumentAccess, canWrite — all permission logic
│   │       │   ├── access.test.ts
│   │       │   ├── documents.ts      # Document row queries (list/insert/update/delete)
│   │       │   ├── shares.ts         # Share row queries
│   │       │   ├── users.ts          # User row queries
│   │       │   ├── parseFile.ts      # .txt / .md / .docx → TipTap HTML
│   │       │   └── parseFile.test.ts
│   │       └── routes/               # HTTP layer only (parse → authorize → call lib → respond)
│   │           ├── documents.ts      # Also nests sharesRouter under /:id/shares
│   │           ├── shares.ts
│   │           └── users.ts
│   │
│   └── web/                          # React + TypeScript frontend (Vite, port 5173)
│       └── src/
│           ├── main.tsx              # Entry point — React Router root
│           ├── App.tsx               # Shell — routes + header
│           ├── api/
│           │   └── client.ts         # Single typed fetch wrapper (all endpoints)
│           ├── auth/
│           │   └── UserContext.tsx   # Login state + localStorage sync
│           ├── hooks/                # Data-fetching hooks (one per resource)
│           │   ├── useDocuments.ts   # Document list: create, upload, delete
│           │   ├── useDocument.ts    # Single document: save, share operations
│           │   └── useDocument.test.ts
│           ├── pages/                # Route-level components (thin — delegate to hooks)
│           │   ├── Login.tsx
│           │   ├── Dashboard.tsx
│           │   ├── DocumentPage.tsx
│           │   └── NotFoundPage.tsx
│           ├── components/           # Reusable, props-only UI pieces
│           │   ├── Editor.tsx
│           │   ├── Toolbar.tsx
│           │   ├── ShareModal.tsx
│           │   ├── Spinner.tsx
│           │   ├── Toaster.tsx
│           │   └── ErrorBoundary.tsx
│           ├── toast/
│           │   └── ToastContext.tsx  # Global toast notification context
│           ├── lib/                  # Pure helpers (no React dependency)
│           │   ├── fontSize.ts       # TipTap font-size extension
│           │   ├── initials.ts       # name → up-to-two-letter initials
│           │   ├── initials.test.ts
│           │   └── formatDate.ts
│           └── styles.css            # Global stylesheet
│
├── packages/
│   └── shared/
│       └── src/
│           └── index.ts              # Shared TypeScript types (import type only)
│
├── supabase/
│   └── schema.sql                    # DB schema + seed users — run in Supabase SQL editor
│
├── package.json                      # Workspaces root + shared scripts
└── vercel.json                       # Vercel deployment config
```

### Key architecture boundaries

```
Backend:  routes/ → lib/ → supabase.ts      (never skip a layer)
Frontend: pages/  → hooks/ → api/client.ts  (components are props-only)
```

- **`lib/`** is the only place that calls `supabase.from(…)`.
- **`hooks/`** is the only place that calls `api/client.ts`.
- **`components/`** never imports from `api/` or `UserContext`.

---

## Usage walkthrough

1. **Sign in** as Alice (one click — no password).
2. **Create** a new document, type some text, and apply formatting from the toolbar.
   Refresh the page — your content and title persist.
3. **Upload** a `.txt`, `.md`, or `.docx` file to create a new document from it.
4. **Share**: open one of your documents, click **Share**, pick **Bob**, choose
   *Can edit* or *Can view*, and confirm.
5. **Log out**, sign in as **Bob**: the shared document appears under
   **Shared with me** with its permission badge. A *view* document opens read-only;
   an *edit* document is fully editable. Bob's own documents appear under
   **My Documents**.

---

## How it works (architecture)

- **Monorepo (npm workspaces).** `apps/web` (React/Vite), `apps/api` (Express),
  `packages/shared` (TypeScript types shared by both).
- **Lightweight auth.** Users are seeded. "Login" looks a user up by email and stores
  it in `localStorage`; the user id is sent as an `x-user-id` header. The backend loads
  that user and enforces access. No passwords — intentional for this exam's scope.
- **Server-side access control.** The backend uses the Supabase **service role** key
  and enforces all permissions in the API layer (`apps/api/src/lib/access.ts`).
  Row Level Security is intentionally **off** and documented as such.
- **Content storage.** Document content is stored as **HTML** (produced by TipTap) in
  the `documents.content` column. Uploaded files are parsed to HTML on the server; the
  raw file is not stored.
- **Frontend → backend only.** The web app calls the Express API via the Vite dev proxy
  (`/api` → `:4000`); it never contacts Supabase directly.

### API endpoints

| Method | Path                                      | Description                                  |
| ------ | ----------------------------------------- | -------------------------------------------- |
| GET    | `/api/users`                              | List seeded users                            |
| POST   | `/api/auth/login`                         | Look up a user by email                      |
| GET    | `/api/documents`                          | `{ owned, shared }` for the current user     |
| POST   | `/api/documents`                          | Create a blank document                      |
| POST   | `/api/documents/upload`                   | Upload `.txt`/`.md`/`.docx` → new document   |
| GET    | `/api/documents/:id`                      | Fetch one document (if you have access)      |
| PATCH  | `/api/documents/:id`                      | Rename / update content                      |
| DELETE | `/api/documents/:id`                      | Delete (owner only)                          |
| GET    | `/api/documents/:id/shares`               | List shares (owner only)                     |
| POST   | `/api/documents/:id/shares`               | Share with a user by email (owner only)      |
| DELETE | `/api/documents/:id/shares/:userId`       | Revoke a share (owner only)                  |

---

## Database schema

Three tables: `users`, `documents` (with `owner_id`), and `document_shares`
(`document_id`, `user_id`, `permission` ∈ {`view`, `edit`}, unique per pair).
See [`supabase/schema.sql`](supabase/schema.sql) for the full definition.

---

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Run API + web together                    |
| `npm run dev:api`   | Run the API only                          |
| `npm run dev:web`   | Run the web app only                      |
| `npm run typecheck` | Type-check both apps                      |
| `npm run build`     | Production build of the web app           |
| `npm test`          | Run Vitest suites for both apps           |

---

## AI workflow

**Claude Code** (Anthropic's CLI agent) was used as a development assistant throughout this project. The collaboration followed a consistent pattern:

- **Architecture & scaffolding** — the monorepo layout, strict layering rules (routes → lib → supabase, pages → hooks → components), and shared-types contract were designed upfront with Claude's input, then enforced as non-negotiable conventions in `CLAUDE.md`.
- **Feature implementation** — iterative feature work (document CRUD, file upload parsing, access-control middleware, sharing flow, toast/error-boundary system) was implemented with Claude generating code inside the established layer boundaries.
- **Incremental refinement** — UI polish (Spinner, Toolbar reordering, DOCX font-size normalization, email-selection logic in ShareModal) was handled in short focused sessions, each scoped to a single concern.
- **Documentation** — `CLAUDE.md`, inline comments, and this README were written or expanded with Claude's help, with the human providing factual grounding (actual file paths, commit history, real design decisions).

The key working principle: **Claude wrote code inside constraints the human set**, rather than making architecture decisions independently. The `CLAUDE.md` file in the repo root captures those constraints so they are enforced consistently across every session.

---

## Notes, scope & trade-offs

- **Auth** is deliberately mocked (seeded users, no passwords) to keep focus on the core
  document/sharing/persistence features within the time budget.
- **RLS is off**; access control is enforced in the API. In a production build I'd move
  to Supabase Auth + RLS policies.
- Uploaded raw files are parsed and discarded (not stored), since the product goal is an
  *editable document*, not file storage.
- A targeted test suite covers the critical logic: `lib/access.ts`, `lib/parseFile.ts`,
  route authorization (supertest), the `useDocument` autosave hook, and pure helpers.
  Run it with `npm test`.
