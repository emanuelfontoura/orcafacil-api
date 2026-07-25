/*
  Warnings:

  - A unique constraint covering the columns `[userId,cnpjCpf]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,cnpjCpf]` on the table `sellers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cnpjCpf]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cnpjCpf` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `clients` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cnpjCpf` to the `sellers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `sellers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cnpjCpf` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_sellerId_fkey";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "cnpjCpf" VARCHAR(14) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL,
ALTER COLUMN "sellerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "sellers" ADD COLUMN     "cnpjCpf" VARCHAR(14) NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cnpjCpf" VARCHAR(14) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_cnpjCpf_key" ON "clients"("userId", "cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "sellers_userId_cnpjCpf_key" ON "sellers"("userId", "cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "users_cnpjCpf_key" ON "users"("cnpjCpf");

-- AddForeignKey
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
