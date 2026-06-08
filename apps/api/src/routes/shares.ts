import { Router, type Request } from "express";
import type { CreateShareRequest, ShareWithUser } from "@docflow/shared";
import { supabase } from "../supabase.js";
import { getDocumentAccess } from "../lib/access.js";

// mergeParams so we can read :id from the parent /documents/:id/shares mount.
export const sharesRouter = Router({ mergeParams: true });

// The parent mount supplies `id`; Express's per-route param typing doesn't know
// about merged params, so read it through this helper.
function documentIdOf(req: Request): string {
  return (req.params as { id: string }).id;
}

// Only the document owner may manage shares.
async function requireOwner(documentId: string, userId: string): Promise<boolean> {
  const access = await getDocumentAccess(documentId, userId);
  return access?.accessLevel === "owner";
}

// GET /api/documents/:id/shares -> list current shares (owner only).
sharesRouter.get("/", async (req, res, next) => {
  try {
    const documentId = documentIdOf(req);
    if (!(await requireOwner(documentId, req.user!.id))) {
      res.status(403).json({ error: "Only the owner can view shares." });
      return;
    }

    const { data, error } = await supabase
      .from("document_shares")
      .select("id, document_id, user_id, permission, created_at, user:users(id, email, name)")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    res.json(data as unknown as ShareWithUser[]);
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/shares -> grant access by email (owner only).
sharesRouter.post("/", async (req, res, next) => {
  try {
    const documentId = documentIdOf(req);
    const ownerId = req.user!.id;
    if (!(await requireOwner(documentId, ownerId))) {
      res.status(403).json({ error: "Only the owner can share this document." });
      return;
    }

    const { email, permission } = req.body as CreateShareRequest;
    if (!email || (permission !== "view" && permission !== "edit")) {
      res.status(400).json({ error: "email and a valid permission (view|edit) are required." });
      return;
    }

    // Resolve the target user by email.
    const { data: target, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (userErr) throw userErr;
    if (!target) {
      res.status(404).json({ error: "No user found with that email." });
      return;
    }
    if (target.id === ownerId) {
      res.status(400).json({ error: "You already own this document." });
      return;
    }

    // Upsert so re-sharing updates the permission level instead of erroring.
    const { data, error } = await supabase
      .from("document_shares")
      .upsert(
        { document_id: documentId, user_id: target.id, permission },
        { onConflict: "document_id,user_id" }
      )
      .select("id, document_id, user_id, permission, created_at, user:users(id, email, name)")
      .single();
    if (error) throw error;

    res.status(201).json(data as unknown as ShareWithUser);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id/shares/:userId -> revoke access (owner only).
sharesRouter.delete("/:userId", async (req, res, next) => {
  try {
    const documentId = documentIdOf(req);
    if (!(await requireOwner(documentId, req.user!.id))) {
      res.status(403).json({ error: "Only the owner can revoke shares." });
      return;
    }

    const { error } = await supabase
      .from("document_shares")
      .delete()
      .eq("document_id", documentId)
      .eq("user_id", req.params.userId);
    if (error) throw error;

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
