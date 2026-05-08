export class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ApiError';
    }

    static badRequest(message: string) {
        return new ApiError(400, message);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(401, message);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(403, message);
    }

    static notFound(message = 'Not found') {
        return new ApiError(404, message);
    }

    static conflict(message = 'Conflict') {
        return new ApiError(409, message);
    }

    static tooManyRequests(message = 'Rate limit exceeded') {
        return new ApiError(429, message);  // when you add rate limiting
    }

    static unprocessable(message = 'Validation failed') {
        return new ApiError(422, message);  // when you add Zod validation
    }

    static internal(message = 'Internal server error') {
        return new ApiError(500, message);
    }

    static serviceUnavailable(message = 'Service unavailable') {
        return new ApiError(503, message);  // when Redis/DB is down
    }
}