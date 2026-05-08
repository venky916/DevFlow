import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userId: req.user?.id ?? 'unauthenticated',
        });
    });

    next()
};