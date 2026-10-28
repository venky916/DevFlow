'use client';

import Mention from '@tiptap/extension-mention';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { useMemo } from 'react';

// the same class the editor gives mentions, so they keep their colour when displayed
const RENDER_EXTENSIONS = [StarterKit, Mention.configure({ HTMLAttributes: { class: 'mention' } })];

const BODY_CLASS =
  'text-[13px] text-text-secondary leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_p]:m-0 [&_.mention]:text-[#00E599] [&_.mention]:bg-[#0a2a1a] [&_.mention]:rounded [&_.mention]:px-1';

// used when a comment can't be drawn: it still shows as plain text instead of crashing the page
function toPlainText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'mention') return `@${node.attrs?.label ?? ''}`;
  const inner = (node.content ?? []).map(toPlainText).join('');
  return ['paragraph', 'heading', 'codeBlock'].includes(node.type) ? `${inner}\n` : inner;
}

export function CommentContent({ content }: { content: object }) {
  const html = useMemo(() => {
    try {
      return generateHTML(content, RENDER_EXTENSIONS);
    } catch {
      return null;
    }
  }, [content]);

  if (html === null) {
    return <p className={`${BODY_CLASS} whitespace-pre-wrap`}>{toPlainText(content)}</p>;
  }

  return <div className={BODY_CLASS} dangerouslySetInnerHTML={{ __html: html }} />;
}
