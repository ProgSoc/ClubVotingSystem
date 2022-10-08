/*
  Warnings:

  - Changed the type of `location` on the `RoomUser` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserLocation" AS ENUM ('InPerson', 'Online');

-- AlterTable
ALTER TABLE "RoomUser" DROP COLUMN "location",
ADD COLUMN     "location" "UserLocation" NOT NULL;

-- DropEnum
DROP TYPE "Location";
