import { z } from 'zod';

export interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
}

export type TiptapContent = TiptapNode;

export const MAX_COMMENT_TEXT_LENGTH = 5000;
export const MAX_COMMENT_JSON_LENGTH = 50_000;
export const MAX_MENTIONS_PER_COMMENT = 20;
const MAX_DEPTH = 12;
const MAX_NODES = 2000;

// only what the editor (StarterKit + mentions) can produce
const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'text',
  'hardBreak',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'mention',
]);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link']);
// blocks that end a line when the content is turned into plain text
const LINE_BLOCKS = new Set(['paragraph', 'heading', 'codeBlock']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// a link may only open a web page or an email, never javascript: or data:
const isSafeHref = (value: unknown) =>
  typeof value === 'string' && value.length <= 2048 && /^(https?:\/\/|mailto:)/i.test(value);

export function getPlainText(node: TiptapNode | null | undefined, depth = 0): string {
  if (!node || depth > 50) return '';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'mention') return `@${String(node.attrs?.label ?? '')}`;
  const inner = (node.content ?? []).map((child) => getPlainText(child, depth + 1)).join('');
  return LINE_BLOCKS.has(node.type) ? `${inner}\n` : inner;
}

// returns the first problem found, or null when the content is fine
function checkTiptapDoc(value: unknown): string | null {
  const invalid = 'Comment content is not valid';

  let json: string | undefined;
  try {
    json = JSON.stringify(value);
  } catch {
    return invalid;
  }
  if (!json) return invalid;
  if (json.length > MAX_COMMENT_JSON_LENGTH) return 'Comment is too large';
  if (!isRecord(value) || value.type !== 'doc') return invalid;

  let nodeCount = 0;
  let mentionCount = 0;

  const visit = (node: unknown, depth: number): string | null => {
    if (depth > MAX_DEPTH) return 'Comment is nested too deeply';
    if (!isRecord(node) || typeof node.type !== 'string') return invalid;
    if (++nodeCount > MAX_NODES) return 'Comment is too complex';
    if (!ALLOWED_NODES.has(node.type)) return 'Comment contains unsupported content';

    if (node.type === 'text') {
      if (typeof node.text !== 'string') return invalid;
    } else if (node.text !== undefined) {
      return invalid;
    }

    if (node.type === 'mention') {
      mentionCount++;
      const attrs = node.attrs;
      if (!isRecord(attrs)) return invalid;
      if (typeof attrs.id !== 'string' || attrs.id.length < 1 || attrs.id.length > 64)
        return invalid;
      // the editor may send a missing label as null
      if (attrs.label != null && (typeof attrs.label !== 'string' || attrs.label.length > 100))
        return invalid;
    }

    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks)) return invalid;
      for (const mark of node.marks) {
        if (!isRecord(mark) || typeof mark.type !== 'string' || !ALLOWED_MARKS.has(mark.type)) {
          return 'Comment contains unsupported formatting';
        }
        if (mark.type === 'link') {
          const attrs = isRecord(mark.attrs) ? mark.attrs : {};
          if (!isSafeHref(attrs.href)) return 'Comment contains an unsafe link';
        }
      }
    }

    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) return invalid;
      for (const child of node.content) {
        const problem = visit(child, depth + 1);
        if (problem) return problem;
      }
    }
    return null;
  };

  const problem = visit(value, 0);
  if (problem) return problem;

  if (mentionCount > MAX_MENTIONS_PER_COMMENT) {
    return `You can mention up to ${MAX_MENTIONS_PER_COMMENT} people in one comment`;
  }
  const text = getPlainText(value as unknown as TiptapNode).trim();
  if (text.length === 0) return 'Comment cannot be empty';
  if (text.length > MAX_COMMENT_TEXT_LENGTH) {
    return `Comment is too long (max ${MAX_COMMENT_TEXT_LENGTH.toLocaleString('en-US')} characters)`;
  }
  return null;
}

const commentContentSchema = z
  .unknown()
  .superRefine((value, ctx) => {
    const problem = checkTiptapDoc(value);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
  })
  .transform((value) => value as TiptapNode);

export const createCommentSchema = z.object({
  content: commentContentSchema,
});

export const updateCommentSchema = createCommentSchema;

// mention extraction: a plain helper, not a schema. Call it after validation.
export function extractMentions(
  doc: TiptapNode | null | undefined,
): { id: string; label: string }[] {
  const found: { id: string; label: string }[] = [];
  const walk = (node: TiptapNode | null | undefined, depth: number) => {
    if (!node || depth > 50) return;
    if (node.type === 'mention' && typeof node.attrs?.id === 'string') {
      found.push({ id: node.attrs.id, label: String(node.attrs.label ?? '') });
    }
    node.content?.forEach((child) => walk(child, depth + 1));
  };
  walk(doc, 0);
  const seen = new Set<string>();
  return found.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
