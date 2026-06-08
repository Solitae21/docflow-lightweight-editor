// Shared types used by both the API and the web app.
// Types only — no runtime code, so no build step is required.

export type Permission = "view" | "edit";

// Access level a given user has on a document.
// "owner" implies full control; "edit"/"view" come from a share.
export type AccessLevel = "owner" | Permission;

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string; // TipTap HTML
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// A document as returned in dashboard lists (includes the viewer's access level).
export interface DocumentListItem extends DocumentRecord {
  accessLevel: AccessLevel;
}

// Full document payload returned when opening a single document.
export interface DocumentDetail extends DocumentRecord {
  accessLevel: AccessLevel;
  ownerName: string;
}

export interface DocumentsResponse {
  owned: DocumentListItem[];
  shared: DocumentListItem[];
}

export interface ShareWithUser {
  id: string;
  document_id: string;
  user_id: string;
  permission: Permission;
  created_at: string;
  user: Pick<User, "id" | "email" | "name">;
}

// Request bodies.
export interface LoginRequest {
  email: string;
}

export interface CreateShareRequest {
  email: string;
  permission: Permission;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
}
