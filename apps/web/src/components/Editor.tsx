import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import { FontSize } from "../lib/fontSize";
import { Toolbar } from "./Toolbar";

interface EditorProps {
  initialContent: string;
  editable: boolean;
  onChange: (html: string) => void;
}

// TipTap rich-text editor. StarterKit provides bold/italic/headings/lists;
// Underline is added separately. Emits HTML on every change.
export function Editor({ initialContent, editable, onChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      Underline,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div>
      {editable && <Toolbar editor={editor} />}
      <div
        className="editor-surface"
        style={editable ? undefined : { borderRadius: "var(--radius)" }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
