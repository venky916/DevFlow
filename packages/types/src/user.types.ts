export interface IUser{
    id: string;
    firebaseUid: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserPublic{
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}