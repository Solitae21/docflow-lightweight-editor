import { Router } from "express";
import multer from "multer";
import type {
  AccessLevel,
  DocumentDetail,
  DocumentListItem,
  DocumentRecord,
  DocumentsResponse,
  UpdateDocumentRequest,
} from "@docflow/shared";
import { supabase } from "../supabase.js";
import { canWrite, getDocumentAccess } from "../lib/access.js";
import { parseFileToHtml, UnsupportedFileError } from "../lib/parseFile.js";

export const documentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// GET /api/documents -> { owned, shared } for the current user.
documentsRouter.get("/", async (req, res, next) => {
  try {
    const userId = req.user!.id;

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

    const body: DocumentsResponse = { owned: ownedItems, shared: sharedItems };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// POST /api/documents -> create a blank document owned by the current user.
documentsRouter.post("/", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const title =
      typeof req.body?.title === "string" && req.body.title.trim()
        ? req.body.title.trim()
        : "Untitled document";

    const { data, error } = await supabase
      .from("documents")
      .insert({ title, content: "", owner_id: userId })
      .select("*")
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/upload -> turn an uploaded .txt/.md/.docx into a new doc.
documentsRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded (field name must be 'file')." });
      return;
    }

    const { title, html } = await parseFileToHtml(
      req.file.originalname,
      req.file.mimetype,
      req.file.buffer
    );

    const { data, error } = await supabase
      .from("documents")
      .insert({ title, content: html, owner_id: userId })
      .select("*")
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    if (err instanceof UnsupportedFileError) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/documents/:id -> single document if the user has access.
documentsRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const access = await getDocumentAccess(req.params.id, userId);
    if (!access) {
      res.status(404).json({ error: "Document not found or no access." });
      return;
    }

    const { data: owner } = await supabase
      .from("users")
      .select("name")
      .eq("id", access.document.owner_id)
      .single();

    const body: DocumentDetail = {
      ...access.document,
      accessLevel: access.accessLevel,
      ownerName: owner?.name ?? "Unknown",
    };
    res.json(body);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/documents/:id -> rename and/or update content (owner or edit-sharee).
documentsRouter.patch("/:id", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const access = await getDocumentAccess(req.params.id, userId);
    if (!access) {
      res.status(404).json({ error: "Document not found or no access." });
      return;
    }
    if (!canWrite(access.accessLevel)) {
      res.status(403).json({ error: "You have view-only access to this document." });
      return;
    }

    const { title, content } = req.body as UpdateDocumentRequest;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof title === "string") updates.title = title.trim() || "Untitled document";
    if (typeof content === "string") updates.content = content;

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id -> owner only.
documentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const access = await getDocumentAccess(req.params.id, userId);
    if (!access) {
      res.status(404).json({ error: "Document not found or no access." });
      return;
    }
    if (access.accessLevel !== "owner") {
      res.status(403).json({ error: "Only the owner can delete this document." });
      return;
    }

    const { error } = await supabase.from("documents").delete().eq("id", req.params.id);
    if (error) throw error;

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
