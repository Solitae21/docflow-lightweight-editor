import type { Permission, ShareWithUser } from "@docflow/shared";
import { supabase } from "../supabase.js";

// Data access for document shares. Routes authorize (owner-only) then call these.

const SHARE_SELECT =
  "id, document_id, user_id, permission, created_at, user:users(id, email, name)";

export async function listShares(documentId: string): Promise<ShareWithUser[]> {
  const { data, error } = await supabase
    .from("document_shares")
    .select(SHARE_SELECT)
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as unknown as ShareWithUser[];
}

// Resolve a user by email; null if no such user.
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Upsert so re-sharing updates the permission level instead of erroring.
export async function upsertShare(
  documentId: string,
  userId: string,
  permission: Permission
): Promise<ShareWithUser> {
  const { data, error } = await supabase
    .from("document_shares")
    .upsert(
      { document_id: documentId, user_id: userId, permission },
      { onConflict: "document_id,user_id" }
    )
    .select(SHARE_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as ShareWithUser;
}

export async function deleteShare(
  documentId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("document_shares")
    .delete()
    .eq("document_id", documentId)
    .eq("user_id", userId);
  if (error) throw error;
}
