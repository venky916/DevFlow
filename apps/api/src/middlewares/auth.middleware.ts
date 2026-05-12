import { Request, Response, NextFunction } from "express"
import { adminAuth } from "@devflow/backend-common"
import { prisma } from "@devflow/db"

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                firebaseUid: string;
                email: string;
                name: string | null;
                avatarUrl: string | null;
            }
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const token = req.headers.authorization?.split('Bearer ')[1]

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        const decoded = await adminAuth.verifyIdToken(token)

        // old way 2 db calls 
        // let user = await prisma.user.findUnique({
        //     where: { firebaseUid: decoded.uid },
        // });

        // if (!user) {
        //     user = await prisma.user.create({
        //         data: {
        //             firebaseUid: decoded.uid,
        //             email: decoded.email ?? '',
        //             name: decoded.name ?? null,
        //             avatarUrl: decoded.picture ?? null,
        //         },
        //     });
        // }

        // 1 db call
        const user = await prisma.user.upsert({
            where: { firebaseUid: decoded.uid },
            update: {},
            create: {
                firebaseUid: decoded.uid,
                email: decoded.email ?? '',
                name: decoded.name ?? null,
                avatarUrl: decoded.picture ?? null,
            },
        });

        req.user = user
        next()
    }
    catch (error) {
        console.error('[Auth] failed:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}