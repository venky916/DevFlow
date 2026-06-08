// packages/types/src/notification.types.ts

export enum NotificationType {
    ISSUE_ASSIGNED = "ISSUE_ASSIGNED",
    ISSUE_COMMENTED = "ISSUE_COMMENTED",
    SPRINT_STARTED = "SPRINT_STARTED",
    SPRINT_COMPLETED = "SPRINT_COMPLETED",
    WORKSPACE_INVITED = "WORKSPACE_INVITED",
    PROJECT_ADDED = "PROJECT_ADDED",
}

export interface INotification {
    id: string;
    content: string;
    type: NotificationType;
    link?: string | null;
    isRead: boolean;
    triggeredBy?: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface INotificationResponse {
    notifications: INotification[];
    unreadCount: number;
}