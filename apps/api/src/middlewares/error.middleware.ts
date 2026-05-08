import { Request, Response, NextFunction } from "express";
import { ApiError } from "../lib/ApiError";
import { logger } from "../lib/logger";

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {

    // console.error(`[Error] ${req.method} ${req.url}:`, err.name, err.message)
    // 4xx — warn, 5xx — error
    if (err instanceof ApiError && err.statusCode < 500) {
        logger.warn({
            message: err.message,
            method: req.method,
            url: req.url,
            statusCode: err.statusCode,
        });
    } else {
        logger.error({
            message: err.message,
            method: req.method,
            url: req.url,
            stack: err.stack,
        });
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            data: null,
        });
    }

    if (err.message.includes("Unique constraint")) {
        return res.status(409).json({
            success: false,
            message: 'Resource already exists',
            data: null,
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
    });
};