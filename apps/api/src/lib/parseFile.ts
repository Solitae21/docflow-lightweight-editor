import mammoth from "mammoth";
import { marked } from "marked";

export class UnsupportedFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileError";
  }
}

export interface ParsedFile {
  title: string; // derived from the filename (without extension)
  html: string; // content as TipTap-compatible HTML
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "").trim();
  return base.length > 0 ? base : "Untitled document";
}

function txtToHtml(buffer: Buffer): string {
  // Preserve paragraph breaks: split on blank lines, wrap each block in <p>,
  // convert remaining single newlines to <br>.
  const text = buffer.toString("utf-8");
  const blocks = text.split(/\r?\n\r?\n/);
  return blocks
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${escapeHtml(block).replace(/\r?\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Convert an uploaded file into HTML for a new document.
 * Supported: .txt, .md, .docx. Anything else throws UnsupportedFileError.
 */
export async function parseFileToHtml(
  filename: string,
  mimetype: string,
  buffer: Buffer
): Promise<ParsedFile> {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const title = titleFromFilename(filename);

  if (ext === "txt") {
    return { title, html: txtToHtml(buffer) };
  }

  if (ext === "md" || ext === "markdown") {
    const html = await marked.parse(buffer.toString("utf-8"));
    return { title, html };
  }

  if (
    ext === "docx" ||
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.convertToHtml({ buffer });
    return { title, html: result.value };
  }

  throw new UnsupportedFileError(
    `Unsupported file type ".${ext}". Supported types: .txt, .md, .docx`
  );
}
