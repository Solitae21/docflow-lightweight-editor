import type { Editor } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor | null;
}

// Rich-text formatting controls wired to TipTap commands.
export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  // Helper to render a toggle button with active-state highlighting.
  const btn = (
    label: string,
    isActive: boolean,
    onClick: () => void,
    title: string
  ) => (
    <button
      type="button"
      title={title}
      className={isActive ? "active" : ""}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
    >
      {label}
    </button>
  );

  // Available text sizes; "" represents the document's default ("Normal").
  const sizes = ["12px", "14px", "16px", "18px", "24px", "32px"];
  const currentSize: string = editor.getAttributes("textStyle").fontSize ?? "";

  return (
    <div className="toolbar">
      {btn("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold")}
      {btn(
        "I",
        editor.isActive("italic"),
        () => editor.chain().focus().toggleItalic().run(),
        "Italic"
      )}
      {btn(
        "U",
        editor.isActive("underline"),
        () => editor.chain().focus().toggleUnderline().run(),
        "Underline"
      )}
      <span className="sep" />
      {btn(
        "H1",
        editor.isActive("heading", { level: 1 }),
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        "Heading 1"
      )}
      {btn(
        "H2",
        editor.isActive("heading", { level: 2 }),
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "Heading 2"
      )}
      {btn(
        "¶",
        editor.isActive("paragraph"),
        () => editor.chain().focus().setParagraph().run(),
        "Normal text"
      )}
      <select
        className="toolbar-select"
        title="Text size"
        value={currentSize}
        onMouseDown={(e) => e.stopPropagation()} // let the native dropdown open
        onChange={(e) => {
          const value = e.target.value;
          if (value) editor.chain().focus().setFontSize(value).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
      >
        <option value="">Normal</option>
        {sizes.map((size) => (
          <option key={size} value={size}>
            {size.replace("px", "")}
          </option>
        ))}
      </select>
      <span className="sep" />
      {btn(
        "• List",
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "Bulleted list"
      )}
      {btn(
        "1. List",
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "Numbered list"
      )}
    </div>
  );
}
