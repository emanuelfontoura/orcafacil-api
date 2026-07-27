/*
  Warnings:

  - You are about to drop the column `cpf` on the `sellers` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "tellphone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "description" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sellers" DROP COLUMN "cpf",
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "tellphone" DROP NOT NULL,
ALTER COLUMN "comissionRate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "description" DROP NOT NULL;
