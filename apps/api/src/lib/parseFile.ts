import mammoth from "mammoth";
import { marked } from "marked";

// Font sizes the editor's toolbar exposes (see Toolbar.tsx). Uploaded docx font
// sizes are snapped to the nearest of these so they round-trip through the same
// `<span style="font-size: Npx">` markup the fontSize TipTap extension produces.
const ALLOWED_FONT_SIZES_PX = [12, 14, 16, 18, 24, 32];
// The editor's default body size; runs that snap to this are left span-free.
const DEFAULT_FONT_SIZE_PX = 16;

function snapFontSizePx(pt: number): number {
  const px = Math.round(pt * (4 / 3)); // 1pt = 4/3px at 96dpi
  return ALLOWED_FONT_SIZES_PX.reduce((best, size) =>
    Math.abs(size - px) < Math.abs(best - px) ? size : best
  );
}

// Tag each run that carries a Word point size with a synthetic style name (e.g.
// "DocflowFs24") that the style map below turns into `<span class="docflow-fs-24px">`.
// Runs that already carry a character style (e.g. Strong/Emphasis) are left untouched
// so we don't clobber their existing mapping; runs that snap to the default size are
// skipped to keep body text span-free. Implemented as a plain recursive walk over
// mammoth's document model (its `transforms.run` helper isn't in the published types).
function tagFontSizes(element: any): any {
  if (element?.type === "run" && element.fontSize && !element.styleName) {
    const size = snapFontSizePx(element.fontSize);
    if (size !== DEFAULT_FONT_SIZE_PX) {
      return { ...element, styleName: `DocflowFs${size}` };
    }
  }
  if (Array.isArray(element?.children)) {
    return { ...element, children: element.children.map(tagFontSizes) };
  }
  return element;
}

// Style map applied on top of mammoth's defaults (user entries win on conflict):
// preserve underline, clamp Word Heading 3–6 down to H2 (the deepest level the
// toolbar can produce), and emit a class-tagged span per snapped font size.
const DOCX_STYLE_MAP = [
  "u => u",
  ...[3, 4, 5, 6].flatMap((n) => [
    `p[style-name='Heading ${n}'] => h2:fresh`,
    `p[style-name='heading ${n}'] => h2:fresh`,
    `p.Heading${n} => h2:fresh`,
  ]),
  ...ALLOWED_FONT_SIZES_PX.map(
    (size) => `r[style-name='DocflowFs${size}'] => span.docflow-fs-${size}px`
  ),
];

// Normalise mammoth's (clean, machine-generated) output onto the editor's supported
// format set. These regexes deliberately operate on mammoth's own predictable markup,
// not arbitrary user HTML, so the usual "don't parse HTML with regex" caveat doesn't
// apply here.
function sanitizeDocxHtml(html: string): string {
  return (
    html
      // our font-size class -> the inline style the fontSize extension reads
      .replace(
        /<span class="docflow-fs-(\d+px)">/g,
        '<span style="font-size: $1">'
      )
      // belt-and-suspenders heading clamp for any stray h3–h6
      .replace(/<(\/?)h[3-6]([^>]*)>/gi, "<$1h2$2>")
      // drop links but keep their text
      .replace(/<\/?a\b[^>]*>/gi, "")
      // drop images entirely
      .replace(/<img\b[^>]*?\/?>/gi, "")
      // flatten tables: strip table tags, keep the inner <p> content
      .replace(/<\/?(table|thead|tbody|tfoot|tr|td|th)\b[^>]*>/gi, "")
  );
}

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
    const result = await mammoth.convertToHtml(
      { buffer },
      { styleMap: DOCX_STYLE_MAP, transformDocument: tagFontSizes }
    );
    return { title, html: sanitizeDocxHtml(result.value) };
  }

  throw new UnsupportedFileError(
    `Unsupported file type ".${ext}". Supported types: .txt, .md, .docx`
  );
}
