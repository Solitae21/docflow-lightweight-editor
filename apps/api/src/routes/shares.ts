import { Router, type Request } from "express";
import type { CreateShareRequest } from "@docflow/shared";
import { requireAccess } from "../middleware/documentAccess.js";
import {
  deleteShare,
  findUserIdByEmail,
  listShares,
  upsertShare,
} from "../lib/shares.js";

// mergeParams so we can read :id from the parent /documents/:id/shares mount.
export const sharesRouter = Router({ mergeParams: true });

// The parent mount supplies `id`; Express's per-route param typing doesn't know
// about merged params, so read it through this helper.
function documentIdOf(req: Request): string {
  return (req.params as { id: string }).id;
}

// Every shares route is owner-only.
sharesRouter.use(requireAccess("owner"));

// GET /api/documents/:id/shares -> list current shares.
sharesRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listShares(documentIdOf(req)));
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/shares -> grant access by email.
sharesRouter.post("/", async (req, res, next) => {
  try {
    const documentId = documentIdOf(req);
    const { email, permission } = req.body as CreateShareRequest;
    if (!email || (permission !== "view" && permission !== "edit")) {
      res.status(400).json({ error: "email and a valid permission (view|edit) are required." });
      return;
    }

    const targetId = await findUserIdByEmail(email);
    if (!targetId) {
      res.status(404).json({ error: "No user found with that email." });
      return;
    }
    if (targetId === req.user!.id) {
      res.status(400).json({ error: "You already own this document." });
      return;
    }

    res.status(201).json(await upsertShare(documentId, targetId, permission));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id/shares/:userId -> revoke access.
sharesRouter.delete("/:userId", async (req, res, next) => {
  try {
    await deleteShare(documentIdOf(req), req.params.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
