-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations

DO $$ BEGIN
 CREATE TYPE "WaitingState" AS ENUM('Kicked', 'Declined', 'Admitted', 'Waiting');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "UserLocation" AS ENUM('Proxy', 'Online', 'InPerson');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "QuestionType" AS ENUM('SingleVote');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"finished_at" timestamp with time zone,
	"migration_name" varchar(255) NOT NULL,
	"logs" text,
	"rolled_back_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_steps_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RoomUser" (
	"id" text PRIMARY KEY NOT NULL,
	"studentEmail" text NOT NULL,
	"state" "WaitingState" NOT NULL,
	"roomId" text NOT NULL,
	"voterId" text,
	"location" "UserLocation" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Room" (
	"id" text PRIMARY KEY NOT NULL,
	"shortId" text NOT NULL,
	"adminKey" text NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"closedAt" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Voter" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuestionCandidate" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"questionId" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Question" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"roomId" text NOT NULL,
	"format" "QuestionType" NOT NULL,
	"votersPresentAtEnd" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "QuestionInteraction" (
	"questionId" text NOT NULL,
	"voterId" text NOT NULL,
	CONSTRAINT QuestionInteraction_pkey PRIMARY KEY("questionId","voterId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CandidateVote" (
	"candidateId" text NOT NULL,
	"voterId" text NOT NULL,
	CONSTRAINT CandidateVote_pkey PRIMARY KEY("candidateId","voterId")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "RoomUser_voterId_key" ON "RoomUser" ("voterId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Room_shortId_key" ON "Room" ("shortId");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RoomUser" ADD CONSTRAINT "RoomUser_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "RoomUser" ADD CONSTRAINT "RoomUser_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionCandidate" ADD CONSTRAINT "QuestionCandidate_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Question" ADD CONSTRAINT "Question_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionInteraction" ADD CONSTRAINT "QuestionInteraction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "QuestionInteraction" ADD CONSTRAINT "QuestionInteraction_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CandidateVote" ADD CONSTRAINT "CandidateVote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "QuestionCandidate"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CandidateVote" ADD CONSTRAINT "CandidateVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
