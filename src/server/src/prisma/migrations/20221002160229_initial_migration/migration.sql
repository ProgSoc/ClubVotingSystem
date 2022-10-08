-- CreateEnum
CREATE TYPE "Location" AS ENUM ('InPerson', 'Online');

-- CreateEnum
CREATE TYPE "WaitingState" AS ENUM ('Waiting', 'Admitted', 'Declined');

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "adminKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomUser" (
    "id" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "location" "Location" NOT NULL,
    "state" "WaitingState" NOT NULL,
    "roomId" TEXT NOT NULL,
    "voterId" TEXT,

    CONSTRAINT "RoomUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voter" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "maxChoices" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCandidate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questionId" TEXT,

    CONSTRAINT "QuestionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateVote" (
    "candidateId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,

    CONSTRAINT "CandidateVote_pkey" PRIMARY KEY ("candidateId","voterId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_shortId_key" ON "Room"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomUser_voterId_key" ON "RoomUser"("voterId");

-- AddForeignKey
ALTER TABLE "RoomUser" ADD CONSTRAINT "RoomUser_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomUser" ADD CONSTRAINT "RoomUser_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCandidate" ADD CONSTRAINT "QuestionCandidate_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateVote" ADD CONSTRAINT "CandidateVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "QuestionCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateVote" ADD CONSTRAINT "CandidateVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
