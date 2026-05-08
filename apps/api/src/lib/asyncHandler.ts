import { Request,Response,NextFunction } from "express";

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>

export const asyncHandler = (fn: AsyncFn) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        next(error);
    }
}