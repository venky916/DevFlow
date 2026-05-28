import { Request, Response } from "express";
import { prisma } from "@devflow/db"
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { sendSuccess, sendNoContent } from "../lib/apiResponse";

// ─── GET /notifications ───────────────────────────────────────
// Get all notifications for logged in user
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id

    const notifications = await prisma.notification.findMany({
        where: {
            userId
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 50
    })

    const unreadCount = await prisma.notification.count({
        where: {
            userId,
            isRead: false
        }
    })

    sendSuccess(res, { notifications, unreadCount }, "Notifications fetched successfully")
})

// ─── PATCH /notifications/:id/read ───────────────────────────
// Mark a single notification as read
export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const notification = await prisma.notification.findUnique({
        where: {
            id: id as string
        }
    })

    if (!notification) {
        throw ApiError.notFound("Notification not found")
    }

    // can only mark your own notifications
    if (notification.userId !== userId) {
        throw ApiError.forbidden("You cannot mark this notification as read")
    }

    const updated = await prisma.notification.update({
        where: { id: id as string },
        data: {
            isRead: true
        }
    })

    sendSuccess(res, updated, "Notification marked as read")
})

// ─── PATCH /notifications/read-all ───────────────────────────
// Mark ALL notifications as read for logged in user
export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id

    await prisma.notification.updateMany({
        where: {
            userId,
            isRead: false
        },
        data: {
            isRead: true
        }
    })

    sendSuccess(res, null, "All notifications marked as read")
})

// ─── DELETE /notifications/:id ────────────────────────────────
// Delete a single notification
export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id

    const notification = await prisma.notification.findUnique({
        where: {
            id: id as string
        }
    })

    if (!notification) {
        throw ApiError.notFound("Notification not found")
    }

    if (notification.userId !== userId) {
        throw ApiError.forbidden('You cannot delete this notification')
    }

    await prisma.notification.delete({
        where: {
            id: id as string
        }
    })

    sendNoContent(res)
})

// ─── DELETE /notifications ──────────────────────────────────
//  Clear all read notifications for logged in user
export const clearReadNotifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id

    await prisma.notification.deleteMany({
        where: {
            userId,
            isRead: true
        }
    })

    sendSuccess(res, null, "Read notifications cleared")

})