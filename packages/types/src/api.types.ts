export interface IApiResponse <T = any>{
    success: boolean;
    data: T;
    message: string;
}


export interface IPaginatedResponse<T = any> extends IApiResponse<T[]> {
    meta: {
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    };
}