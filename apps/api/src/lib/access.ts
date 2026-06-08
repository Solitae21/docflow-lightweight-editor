import type { AccessLevel, DocumentRecord } from "@docflow/shared";
import { supabase } from "../supabase.js";

export interface AccessResult {
  document: DocumentRecord;
  accessLevel: AccessLevel;
}

/**
 * Determine a user's access to a document.
 * - owner_id match  -> "owner"
 * - share row       -> "edit" | "view" (the share's permission)
 * - otherwise       -> null (no access)
 *
 * Returns null if the document does not exist or the user has no access.
 */
export async function getDocumentAccess(
  documentId: string,
  userId: string
): Promise<AccessResult | null> {
  const { data: document, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (error || !document) return null;

  const doc = document as DocumentRecord;

  if (doc.owner_id === userId) {
    return { document: doc, accessLevel: "owner" };
  }

  const { data: share } = await supabase
    .from("document_shares")
    .select("permission")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (share) {
    return { document: doc, accessLevel: share.permission as AccessLevel };
  }

  return null;
}

export function canWrite(accessLevel: AccessLevel): boolean {
  return accessLevel === "owner" || accessLevel === "edit";
}
