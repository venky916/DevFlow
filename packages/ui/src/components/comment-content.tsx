"use client";

import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";

const RENDER_EXTENSIONS = [StarterKit, Mention];

export function CommentContent({ content }: { content: object }) {
  const html = generateHTML(content, RENDER_EXTENSIONS);

  return (
    <div
      className="text-[13px] text-text-secondary leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_p]:m-0 [&_.mention]:text-[#00E599] [&_.mention]:bg-[#0a2a1a] [&_.mention]:rounded [&_.mention]:px-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
