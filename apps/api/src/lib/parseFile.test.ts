import { describe, expect, it } from "vitest";
import {
  parseFileToHtml,
  sanitizeDocxHtml,
  snapFontSizePx,
  UnsupportedFileError,
} from "./parseFile.js";

const buf = (s: string) => Buffer.from(s, "utf-8");

describe("parseFileToHtml — title derivation", () => {
  it("strips the extension to form the title", async () => {
    const { title } = await parseFileToHtml("Report.txt", "text/plain", buf("hi"));
    expect(title).toBe("Report");
  });

  it("falls back to 'Untitled document' for a dotfile-only name", async () => {
    const { title } = await parseFileToHtml(".txt", "text/plain", buf("hi"));
    expect(title).toBe("Untitled document");
  });
});

describe("parseFileToHtml — .txt", () => {
  it("wraps blank-line-separated blocks in <p> and escapes HTML", async () => {
    const { html } = await parseFileToHtml(
      "a.txt",
      "text/plain",
      buf("first\n\nsecond & <b>")
    );
    expect(html).toBe("<p>first</p><p>second &amp; &lt;b&gt;</p>");
  });

  it("converts single newlines within a block to <br>", async () => {
    const { html } = await parseFileToHtml("a.txt", "text/plain", buf("l1\nl2"));
    expect(html).toBe("<p>l1<br>l2</p>");
  });
});

describe("parseFileToHtml — .md", () => {
  it("converts markdown to HTML", async () => {
    const { html } = await parseFileToHtml("a.md", "text/markdown", buf("# Hi"));
    expect(html).toContain("<h1");
    expect(html).toContain("Hi");
  });
});

describe("parseFileToHtml — unsupported", () => {
  it("throws UnsupportedFileError for an unknown extension", async () => {
    await expect(
      parseFileToHtml("a.pdf", "application/pdf", buf("x"))
    ).rejects.toBeInstanceOf(UnsupportedFileError);
  });
});

describe("snapFontSizePx", () => {
  it("snaps a Word point size to the nearest allowed px size", () => {
    expect(snapFontSizePx(12)).toBe(16); // 12pt -> 16px exactly
    expect(snapFontSizePx(18)).toBe(24); // 18pt -> 24px exactly
    expect(snapFontSizePx(11)).toBe(14); // 11pt -> ~14.67 -> nearest 14
    expect(snapFontSizePx(9)).toBe(12); // 9pt -> 12px exactly
  });
});

describe("sanitizeDocxHtml", () => {
  it("rewrites the font-size class to an inline style", () => {
    expect(sanitizeDocxHtml('<span class="docflow-fs-24px">x</span>')).toBe(
      '<span style="font-size: 24px">x</span>'
    );
  });

  it("clamps stray h3–h6 down to h2", () => {
    expect(sanitizeDocxHtml("<h3>a</h3><h5>b</h5>")).toBe("<h2>a</h2><h2>b</h2>");
  });

  it("drops links but keeps their text", () => {
    expect(sanitizeDocxHtml('<a href="x">link</a>')).toBe("link");
  });

  it("drops images and flattens table tags", () => {
    expect(sanitizeDocxHtml('<img src="x" />')).toBe("");
    expect(sanitizeDocxHtml("<table><tr><td><p>c</p></td></tr></table>")).toBe(
      "<p>c</p>"
    );
  });
});
