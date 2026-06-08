# DocFlow — Submission

## What is included

### 1. Document Creation and Editing

**Create, rename, save, and reopen documents:**
- Create a blank document via the Dashboard ("New document" button)
- Rename a document from the document page (inline title edit)
- Autosave with an 800ms debounce; status indicator shows "saved / saving / unsaved / error"
- All documents persist in Supabase (Postgres) and survive page refresh
- Reopen any document from the Dashboard

**Rich-text formatting supported (TipTap editor):**
- Bold, Italic, Underline
- Headings: H1, H2
- Bulleted lists, numbered lists
- Font size: 12 px, 14 px, 16 px (default), 18 px, 24 px, 32 px
- Content is stored as TipTap-generated HTML

All formatting controls are in the persistent toolbar above the editor.

---

### 2. File Upload

Upload a file from the Dashboard ("Upload" button). The file is parsed into HTML and saved as a new editable document; the original file is not retained.

**Supported file types:**

| Type | Extension(s) | Notes |
|------|-------------|-------|
| Plain text | `.txt` | Lines wrapped in `<p>`, blank lines become paragraph breaks |
| Markdown | `.md`, `.markdown` | Parsed with the `marked` library |
| Word | `.docx` | Converted with `mammoth`; underline, headings (H3–H6 clamped to H2), and font sizes (snapped to the toolbar's 6 sizes) are preserved; images and hyperlinks are stripped |

**Size limit:** 10 MB per upload.

Unsupported file types are rejected with a clear error message in the UI. The `accept` attribute on the file input enforces the three supported types.

---

### 3. Sharing

**Sharing model:**

Every document has exactly one **owner**. The owner can grant any other registered user **view** or **edit** access.

| Access level | Can read | Can edit content / title | Can manage shares | Can delete |
|---|---|---|---|---|
| owner | ✓ | ✓ | ✓ | ✓ |
| edit | ✓ | ✓ | ✗ | ✗ |
| view | ✓ | ✗ | ✗ | ✗ |

**How to share:**
1. Open a document you own.
2. Click the "Share" button (top-right of the document page).
3. Select a user by email, choose "Can edit" or "Can view", click "Share".
4. Existing shares are listed with a "Remove" button to revoke access.
5. Re-sharing a user with a different permission updates the existing share (upsert).

**Distinction between owned and shared documents:**
- The Dashboard separates documents into **"My documents"** and **"Shared with me"** sections.
- Document cards in the shared section show a permission badge ("edit" or "view").
- View-only documents open with the editor locked and a banner: "View-only — shared by [owner name]. You can read but not edit this document."

**Users:**
Three demo accounts are seeded in the database. Log in as any of them to demonstrate the sharing flow:

| Name | Email |
|------|-------|
| Alice | alice@example.com |
| Bob | bob@example.com |
| Carol | carol@example.com |

Auth is lightweight by design (exam scope): pick an email on the Login page, and that user's session is stored in `localStorage`. No passwords.

---

### 4. Persistence

**Storage:** Supabase (Postgres)

**Tables:**

- `users` — seeded demo accounts
- `documents` — id, title, content (TipTap HTML), owner_id, created_at, updated_at
- `document_shares` — document_id, user_id, permission ('view' | 'edit'), unique per (document, user)

**What persists:**
- Document title and full rich-text content (formatting, headings, lists, font sizes) survive page refresh
- Share relationships survive page refresh; re-opening a shared document restores the correct access level
- Deleting a document cascades to remove its shares

The Supabase service-role key is server-side only (Express API). The frontend never talks to Supabase directly — all data access goes through the API.

Schema is in `supabase/schema.sql` and can be run in the Supabase SQL editor to set up a fresh database.

---

## Tech stack summary

| Layer | Choice |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, React Router, TipTap |
| Backend | Node, Express, TypeScript (tsx) |
| Database | Supabase (Postgres) |
| File parsing | mammoth (docx), marked (md) |
| Monorepo | npm workspaces |

---

## How to run

```bash
# 1. Install dependencies (repo root)
npm install

# 2. Configure backend environment
cp apps/api/.env.example apps/api/.env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

# 3. Set up the database
# Run supabase/schema.sql in the Supabase SQL editor

# 4. Start both servers
npm run dev
# API: http://localhost:4000
# Web: http://localhost:5173
```

---

## What is not included

- Real authentication (passwords, JWTs, OAuth) — users are seeded and login is email-only
- Image or attachment uploads — only `.txt`, `.md`, and `.docx` are supported
- Real-time collaborative editing (concurrent users on the same document)
- Self-service user registration
