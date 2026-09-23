import { Request, Response } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { sendSuccess } from "../lib/apiResponse"; // adjust to your actual path
import { prisma } from "@devflow/db";

const WORKSPACE_LIMIT = 5;
const PROJECT_LIMIT = 5;
const ISSUE_LIMIT = 5;
const SETTINGS_LIMIT = 5;

export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const q = String(req.query.q ?? "").trim();

    if (q.length < 2) {
        sendSuccess(res, { items: [] });
    }
    const needle = q.toLowerCase();

    // 1. Every workspace this user belongs to, with their role in each
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: {
            role: true,
            workspace: { select: { id: true, name: true, slug: true } },
        },
    });

    const adminWsIds = memberships.filter(m => m.role === "ADMIN").map(m => m.workspace.id);
    const memberWsIds = memberships.filter(m => m.role === "MEMBER").map(m => m.workspace.id);

    // 2. Every project this user can open, plus their role (or admin) —
    //    same rule as resolveProjectAccess, in set form
    const projects = await prisma.project.findMany({
        where: {
            OR: [
                { workspaceId: { in: adminWsIds } },
                { workspaceId: { in: memberWsIds }, members: { some: { userId } } },
            ],
        },
        select: {
            id: true,
            name: true,
            slug: true,
            workspace: { select: { id: true, name: true, slug: true } },
            members: { where: { userId }, select: { role: true } },
        },
    });

    const isWsAdmin = (wsId: string) => adminWsIds.includes(wsId);
    const projectRole = (p: (typeof projects)[number]) => p.members[0]?.role ?? null;

    // 3. Issues inside those projects, matched in the DB
    const issues = await prisma.issue.findMany({
        where: {
            projectId: { in: projects.map(p => p.id) },
            title: { contains: q, mode: "insensitive" },
        },
        orderBy: { updatedAt: "desc" },
        take: ISSUE_LIMIT,
        select: { id: true, title: true, projectId: true },
    });
    const projectById = new Map(projects.map(p => [p.id, p]));

    // ── Build the flat, uniform result list ──
    const items: { type: string; id: string; name: string; context: string | null; url: string }[] = [];

    memberships
        .filter(m => m.workspace.name.toLowerCase().includes(needle))
        .slice(0, WORKSPACE_LIMIT)
        .forEach(m => {
            items.push({
                type: "workspace",
                id: m.workspace.id,
                name: m.workspace.name,
                context: null,
                url: `/${m.workspace.slug}`,
            });
        });

    projects
        .filter(p => p.name.toLowerCase().includes(needle))
        .slice(0, PROJECT_LIMIT)
        .forEach(p => {
            items.push({
                type: "project",
                id: p.id,
                name: p.name,
                context: p.workspace.name,
                url: `/${p.workspace.slug}/${p.slug}/board`,
            });
        });

    issues.forEach(i => {
        const p = projectById.get(i.projectId)!;
        items.push({
            type: "issue",
            id: i.id,
            name: i.title,
            context: `${p.workspace.name} · ${p.name}`,
            // placeholder — swap in your real issue detail route
            url: `/${p.workspace.slug}/${p.slug}/issues/${i.id}`,
        });
    });

    // ── Settings rows only, only where the role allows ──
    if ("settings".includes(needle)) {
        memberships
            .filter(m => m.role === "ADMIN")
            .forEach(m => {
                items.push({
                    type: "page",
                    id: `${m.workspace.id}:settings`,
                    name: "Settings",
                    context: m.workspace.name,
                    url: `/${m.workspace.slug}/settings`,
                });
            });

        projects
            .filter(p => isWsAdmin(p.workspace.id) || projectRole(p) === "LEAD")
            .forEach(p => {
                items.push({
                    type: "page",
                    id: `${p.id}:settings`,
                    name: "Settings",
                    context: `${p.workspace.name} · ${p.name}`,
                    url: `/${p.workspace.slug}/${p.slug}/settings`,
                });
            });
    }
    const settingsCount = items.filter(i => i.type === "page").length;
    if (settingsCount > SETTINGS_LIMIT) {
        // trim from the end without touching workspace/project/issue rows above it
        let toRemove = settingsCount - SETTINGS_LIMIT;
        for (let i = items.length - 1; i >= 0 && toRemove > 0; i--) {
            if (items[i]?.type === "page") {
                items.splice(i, 1);
                toRemove--;
            }
        }
    }

    sendSuccess(res, { items });
});