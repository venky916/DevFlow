export type ActivityScope = 'ISSUE' | 'PROJECT'

export interface IActivityLog {
    id: string;
    action: string;
    scope: ActivityScope;
    meta: Record<string, any> | null;
    userId: string;
    issueId: string | null;
    projectId: string;
    createdAt: Date;
    user?: {
        id: string;
        name: string | null;
        avatarUrl: string | null;
    }
    issue?: {
        id: string;
        title: string;
    } | null
}