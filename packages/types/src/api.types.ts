export interface IApiResponse<T> {
    success: boolean;
    data: T;
    message: string;
}


export interface IPaginatedData<T> {
    items: T[];
    meta: { total: number; page: number; limit: number; hasMore: boolean };
}

export interface ICursorPaginatedData<T> {
    items: T[];
    meta: { nextCursor: string | null; hasMore: boolean };
}