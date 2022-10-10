-- CreateTable
CREATE TABLE "QuestionInteraction" (
    "questionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,

    CONSTRAINT "QuestionInteraction_pkey" PRIMARY KEY ("questionId","voterId")
);

-- AddForeignKey
ALTER TABLE "QuestionInteraction" ADD CONSTRAINT "QuestionInteraction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionInteraction" ADD CONSTRAINT "QuestionInteraction_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
