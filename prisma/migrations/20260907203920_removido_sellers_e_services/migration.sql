/*
  Warnings:

  - You are about to drop the column `sellerId` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the `sellers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `services` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "sellers" DROP CONSTRAINT "sellers_userId_fkey";

-- DropForeignKey
ALTER TABLE "services" DROP CONSTRAINT "services_userId_fkey";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "sellerId";

-- DropTable
DROP TABLE "sellers";

-- DropTable
DROP TABLE "services";
