import { Router } from "express";
import multer from "multer";
import type { UpdateDocumentRequest } from "@docflow/shared";
import { requireAccess } from "../middleware/documentAccess.js";
import {
  deleteDocument,
  insertDocument,
  listDocumentsForUser,
  toDocumentDetail,
  updateDocument,
} from "../lib/documents.js";
import { parseFileToHtml, UnsupportedFileError } from "../lib/parseFile.js";
import { sharesRouter } from "./shares.js";

export const documentsRouter = Router();

// Sharing lives under a specific document; nested here so the parent's
// requireUser auth applies once. sharesRouter uses mergeParams to read :id.
documentsRouter.use("/:id/shares", sharesRouter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function cleanTitle(raw: unknown): string {
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Untitled document";
}

// GET /api/documents -> { owned, shared } for the current user.
documentsRouter.get("/", async (req, res, next) => {
  try {
    res.json(await listDocumentsForUser(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// POST /api/documents -> create a blank document owned by the current user.
documentsRouter.post("/", async (req, res, next) => {
  try {
    const doc = await insertDocument(req.user!.id, cleanTitle(req.body?.title), "");
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/upload -> turn an uploaded .txt/.md/.docx into a new doc.
documentsRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded (field name must be 'file')." });
      return;
    }

    const { title, html } = await parseFileToHtml(
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer
    );
    const doc = await insertDocument(req.user!.id, title, html);
    res.status(201).json(doc);
  } catch (err) {
    if (err instanceof UnsupportedFileError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/documents/:id -> single document if the user has any access.
documentsRouter.get("/:id", requireAccess("view"), async (req, res, next) => {
  try {
    const { document, accessLevel } = req.access!;
    res.json(await toDocumentDetail(document, accessLevel));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/documents/:id -> rename and/or update content (owner or edit-sharee).
documentsRouter.patch("/:id", requireAccess("edit"), async (req, res, next) => {
  try {
    const { title, content } = req.body as UpdateDocumentRequest;
    const doc = await updateDocument(req.params.id, {
      title: typeof title === "string" ? cleanTitle(title) : undefined,
      content: typeof content === "string" ? content : undefined,
    });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id -> owner only.
documentsRouter.delete("/:id", requireAccess("owner"), async (req, res, next) => {
  try {
    await deleteDocument(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
