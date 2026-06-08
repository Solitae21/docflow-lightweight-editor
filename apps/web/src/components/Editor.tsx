import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
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
    extensions: [StarterKit, Underline],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div>
      {editable && <Toolbar editor={editor} />}
      <div className="editor-surface" style={editable ? undefined : { borderRadius: 8 }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
