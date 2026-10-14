export interface IUser {
    id: string;
    firebaseUid: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    timezone: string;       // 1. added
    createdAt: string;      // 2. Date → string
    updatedAt: string;      // 3. Date → string
}

export interface IUserPublic {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}
export interface ISidebarCounts {
    unreadNotifications: number;
    myOpenIssues: number;
}