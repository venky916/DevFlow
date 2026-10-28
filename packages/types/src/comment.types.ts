import type { IUserSummary } from './user.types';

// the editor's content tree
export interface ITiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: ITiptapNode[];
}

export interface IComment {
  id: string;
  content: ITiptapNode;
  issueId: string;
  userId: string;
  createdAt: string;
  updatedAt: string; // different from createdAt once the comment was edited
  user: IUserSummary;
}
