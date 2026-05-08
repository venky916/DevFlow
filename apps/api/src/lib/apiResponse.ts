import { Response } from 'express';

export const sendSuccess = (
    res: Response,
    data: any,
    message = 'Success',
    statusCode = 200
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

export const sendCreated = (
    res: Response,
    data: any,
    message = 'Created successfully'
) => {
    return sendSuccess(res, data, message, 201);
};

// things you might add later
export const sendPaginated = (res: Response, data: any, meta: any) => {
    return res.status(200).json({
        success: true,
        data,
        meta: {
            total: meta.total,
            page: meta.page,
            limit: meta.limit,
            hasMore: meta.hasMore
        }
    })
}
// when you add pagination to GET /issues (could be 100s of issues)

export const sendNoContent = (res: Response) => {
    return res.status(204).send();
};

export const sendError = (
    res: Response,
    message = 'Something went wrong',
    statusCode = 500
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
    });
};