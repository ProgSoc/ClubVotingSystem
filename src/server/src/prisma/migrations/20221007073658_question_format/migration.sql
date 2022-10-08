/*
  Warnings:

  - You are about to drop the column `maxChoices` on the `Question` table. All the data in the column will be lost.
  - Added the required column `format` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionFormat" AS ENUM ('SingleAnswer');

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "maxChoices",
ADD COLUMN     "format" "QuestionFormat" NOT NULL;
