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

## Setup

### 1. Install dependencies

From the repository root:

```bash
npm install
```

This installs all workspaces (`apps/api`, `apps/web`, `packages/shared`).

### 2. Create the database schema

In the Supabase dashboard, open **SQL Editor → New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the `users`,
`documents`, and `document_shares` tables and seeds three demo users:

| Name  | Email               |
| ----- | ------------------- |
| Alice | `alice@example.com` |
| Bob   | `bob@example.com`   |
| Carol | `carol@example.com` |

> The script drops the DocFlow tables first, so it is safe to re-run to reset state.

### 3. Configure the backend environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp apps/api/.env.example apps/api/.env
```

Set the values (from **Supabase → Project Settings → API**):

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
```

> Use the **service role** key. It is used only on the server and is never exposed to
> the browser. The frontend needs no environment variables in development.

### 4. Run

```bash
npm run dev
```

This starts:

- the API at **http://localhost:4000**
- the web app at **http://localhost:5173**

Open **http://localhost:5173** and sign in by picking a seeded account.

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

---

## Notes, scope & trade-offs

- **Auth** is deliberately mocked (seeded users, no passwords) to keep focus on the core
  document/sharing/persistence features within the time budget.
- **RLS is off**; access control is enforced in the API. In a production build I'd move
  to Supabase Auth + RLS policies.
- Uploaded raw files are parsed and discarded (not stored), since the product goal is an
  *editable document*, not file storage.
- No automated test suite within the exam time budget; verification is manual via the
  walkthrough above.
