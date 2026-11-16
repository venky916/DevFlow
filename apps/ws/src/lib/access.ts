import { prisma } from '@devflow/db';

// A user may join a project's room if they are a project member, or an admin of its workspace
export async function canAccessProject(userId: string, projectId: string): Promise<boolean> {
  const member = await prisma.projectMember.findFirst({ where: { projectId, userId } });
  if (member) return true;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) return false;

  const admin = await prisma.workspaceMember.findFirst({
    where: { workspaceId: project.workspaceId, userId, role: 'ADMIN' },
  });
  return !!admin;
}
