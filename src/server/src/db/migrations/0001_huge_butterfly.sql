DROP TABLE "_prisma_migrations";--> statement-breakpoint
ALTER TABLE "RoomUser" DROP CONSTRAINT "RoomUser_roomId_fkey";
--> statement-breakpoint
ALTER TABLE "RoomUser" DROP CONSTRAINT "RoomUser_voterId_fkey";
--> statement-breakpoint
ALTER TABLE "QuestionCandidate" DROP CONSTRAINT "QuestionCandidate_questionId_fkey";
--> statement-breakpoint
ALTER TABLE "Question" DROP CONSTRAINT "Question_roomId_fkey";
--> statement-breakpoint
ALTER TABLE "QuestionInteraction" DROP CONSTRAINT "QuestionInteraction_questionId_fkey";
--> statement-breakpoint
ALTER TABLE "QuestionInteraction" DROP CONSTRAINT "QuestionInteraction_voterId_fkey";
--> statement-breakpoint
ALTER TABLE "CandidateVote" DROP CONSTRAINT "CandidateVote_candidateId_fkey";
--> statement-breakpoint
ALTER TABLE "CandidateVote" DROP CONSTRAINT "CandidateVote_voterId_fkey";
--> statement-breakpoint
ALTER TABLE "Room" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "Question" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RoomUser" ADD CONSTRAINT "RoomUser_roomId_Room_id_fk" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RoomUser" ADD CONSTRAINT "RoomUser_voterId_Voter_id_fk" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionCandidate" ADD CONSTRAINT "QuestionCandidate_questionId_Question_id_fk" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Question" ADD CONSTRAINT "Question_roomId_Room_id_fk" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionInteraction" ADD CONSTRAINT "QuestionInteraction_questionId_Question_id_fk" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionInteraction" ADD CONSTRAINT "QuestionInteraction_voterId_Voter_id_fk" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CandidateVote" ADD CONSTRAINT "CandidateVote_candidateId_QuestionCandidate_id_fk" FOREIGN KEY ("candidateId") REFERENCES "QuestionCandidate"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CandidateVote" ADD CONSTRAINT "CandidateVote_voterId_Voter_id_fk" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
