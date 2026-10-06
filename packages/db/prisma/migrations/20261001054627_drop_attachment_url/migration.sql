/*
  Warnings:

  - You are about to drop the column `url` on the `attachments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fileKey]` on the table `attachments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "url";

-- CreateIndex
CREATE UNIQUE INDEX "attachments_fileKey_key" ON "attachments"("fileKey");
