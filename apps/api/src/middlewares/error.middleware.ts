import { Request, Response, NextFunction } from "express";
import { ApiError } from "../lib/ApiError";
import { logger } from "@devflow/backend-common";
import { ZodError } from "zod";

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {

    // console.error(`[Error] ${req.method} ${req.url}:`, err.name, err.message)

    // Zod validation errors
    if (err instanceof ZodError) {
        logger.warn({
            message: 'Validation failed',
            url: req.url,
            errors: err.issues,
        });
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: err.issues.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
            data: null,
        });
    }

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