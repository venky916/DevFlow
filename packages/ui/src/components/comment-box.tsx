"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { Paperclip, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

interface CommentBoxProps {
  onSubmit: (json: object) => Promise<void> | void;
  onCancel?: () => void;
  placeholder?: string;
  initialContent?: object;
  mentionSuggestion?: any;
  submitLabel?: string;
}

export function CommentBox({
  onSubmit,
  onCancel,
  placeholder = "Leave a comment...",
  initialContent,
  mentionSuggestion,
  submitLabel = "Send",
}: CommentBoxProps) {
  const [submitting, setSubmitting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: mentionSuggestion,
      }),
    ],
    content: initialContent ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "text-[13px] text-white focus:outline-none min-h-[24px]",
      },
    },
  });

  if (!editor) return null;

  const handleSubmit = async () => {
    if (editor.isEmpty || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit(editor.getJSON());
      editor.commands.clearContent();
    } finally {
      setSubmitting(false);
    }
  };

  const toolbarBtnClass = (active: boolean) =>
    `w-[26px] h-[26px] flex items-center justify-center rounded ${
      active
        ? "bg-[#1a1a1a] text-white"
        : "text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white"
    }`;

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg px-3.5 pt-3.5 pb-2.5">
      <div className="pb-3.5 border-b border-[#1f1f1f]">
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center justify-between pt-2.5">
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={toolbarBtnClass(editor.isActive("bold"))}
          >
            <span className="text-[13px] font-bold">B</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={toolbarBtnClass(editor.isActive("italic"))}
          >
            <span className="text-[13px] italic">I</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={toolbarBtnClass(editor.isActive("underline"))}
          >
            <span className="text-[13px] underline">U</span>
          </button>
          <button type="button" className={toolbarBtnClass(false)}>
            <Paperclip size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-w-[52px]"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
