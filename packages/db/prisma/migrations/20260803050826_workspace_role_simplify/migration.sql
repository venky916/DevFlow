/*
  Warnings:

  - The values [DEVELOPER,VIEWER] on the enum `WorkspaceRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WorkspaceRole_new" AS ENUM ('ADMIN', 'MEMBER');
ALTER TABLE "public"."workspace_invites" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."workspace_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "workspace_invites" ALTER COLUMN "role" TYPE "WorkspaceRole_new" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'ADMIN'
    ELSE 'MEMBER'
  END
)::"WorkspaceRole_new";
ALTER TABLE "workspace_members" ALTER COLUMN "role" TYPE "WorkspaceRole_new" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'ADMIN'
    ELSE 'MEMBER'
  END
)::"WorkspaceRole_new";
ALTER TYPE "WorkspaceRole" RENAME TO "WorkspaceRole_old";
ALTER TYPE "WorkspaceRole_new" RENAME TO "WorkspaceRole";
DROP TYPE "public"."WorkspaceRole_old";
ALTER TABLE "workspace_invites" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
COMMIT;

-- AlterTable
ALTER TABLE "workspace_invites" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
