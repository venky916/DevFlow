-- migrate existing OWNER data to ADMIN first
UPDATE workspace_members SET role = 'ADMIN' WHERE role = 'OWNER';
UPDATE workspace_invites SET role = 'ADMIN' WHERE role = 'OWNER';

/*
  Warnings:

  - The values [OWNER] on the enum `WorkspaceRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WorkspaceRole_new" AS ENUM ('ADMIN', 'LEAD', 'DEVELOPER', 'VIEWER');
ALTER TABLE "public"."workspace_invites" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."workspace_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "workspace_invites" ALTER COLUMN "role" TYPE "WorkspaceRole_new" USING ("role"::text::"WorkspaceRole_new");
ALTER TABLE "workspace_members" ALTER COLUMN "role" TYPE "WorkspaceRole_new" USING ("role"::text::"WorkspaceRole_new");
ALTER TYPE "WorkspaceRole" RENAME TO "WorkspaceRole_old";
ALTER TYPE "WorkspaceRole_new" RENAME TO "WorkspaceRole";
DROP TYPE "public"."WorkspaceRole_old";
ALTER TABLE "workspace_invites" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER';
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'DEVELOPER';
COMMIT;
