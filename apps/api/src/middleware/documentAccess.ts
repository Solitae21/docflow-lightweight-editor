import type { NextFunction, Request, Response } from "express";
import { canWrite, getDocumentAccess, type AccessResult } from "../lib/access.js";

// Attach the resolved access for the route's :id param so handlers can read it.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      access?: AccessResult;
    }
  }
}

type RequiredLevel = "view" | "edit" | "owner";

/**
 * Authorize the current user against the `:id` document and attach the result to
 * `req.access`. Replaces the getDocumentAccess → 404 → permission-check boilerplate
 * that every document route otherwise repeats.
 *
 * - "view"  — any access (owner, edit, or view)
 * - "edit"  — owner or edit-sharee
 * - "owner" — owner only
 *
 * Works under mergeParams, so it serves both /documents/:id and
 * /documents/:id/shares routes.
 */
export function requireAccess(level: RequiredLevel) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const documentId = (req.params as { id: string }).id;
    const access = await getDocumentAccess(documentId, req.user!.id);
    if (!access) {
      res.status(404).json({ error: "Document not found or no access." });
      return;
    }

    if (level === "owner" && access.accessLevel !== "owner") {
      res.status(403).json({ error: "Only the document owner can do that." });
      return;
    }
    if (level === "edit" && !canWrite(access.accessLevel)) {
      res.status(403).json({ error: "You have view-only access to this document." });
      return;
    }

    req.access = access;
    next();
  };
}
