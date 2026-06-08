import type {
  AccessLevel,
  DocumentDetail,
  DocumentListItem,
  DocumentRecord,
  DocumentsResponse,
} from "@docflow/shared";
import { supabase } from "../supabase.js";

// Data access for documents. The only place document rows are read/written;
// route handlers call these and never touch supabase directly (CLAUDE.md #1).

export async function listDocumentsForUser(
  userId: string
): Promise<DocumentsResponse> {
  const { data: owned, error: ownedErr } = await supabase
    .from("documents")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (ownedErr) throw ownedErr;

  // Documents shared with this user, plus the permission granted.
  const { data: shareRows, error: shareErr } = await supabase
    .from("document_shares")
    .select("permission, documents(*)")
    .eq("user_id", userId);
  if (shareErr) throw shareErr;

  const ownedItems: DocumentListItem[] = (owned ?? []).map((d) => ({
    ...d,
    accessLevel: "owner",
  }));

  const sharedItems: DocumentListItem[] = (shareRows ?? [])
    .filter((row) => row.documents) // guard against orphaned shares
    .map((row) => ({
      ...(row.documents as unknown as DocumentRecord),
      accessLevel: row.permission as AccessLevel,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return { owned: ownedItems, shared: sharedItems };
}

export async function insertDocument(
  ownerId: string,
  title: string,
  content: string
): Promise<DocumentRecord> {
  const { data, error } = await supabase
    .from("documents")
    .insert({ title, content, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data as DocumentRecord;
}

// Assemble the single-document payload from an already-authorized document.
export async function toDocumentDetail(
  document: DocumentRecord,
  accessLevel: AccessLevel
): Promise<DocumentDetail> {
  const { data: owner } = await supabase
    .from("users")
    .select("name")
    .eq("id", document.owner_id)
    .single();

  return { ...document, accessLevel, ownerName: owner?.name ?? "Unknown" };
}

export async function updateDocument(
  id: string,
  fields: { title?: string; content?: string }
): Promise<DocumentRecord> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof fields.title === "string") updates.title = fields.title;
  if (typeof fields.content === "string") updates.content = fields.content;

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as DocumentRecord;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}
