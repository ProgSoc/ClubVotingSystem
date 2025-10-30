CREATE TYPE "public"."question_format" AS ENUM('SingleVote', 'PreferentialVote');--> statement-breakpoint
CREATE TYPE "public"."user_location" AS ENUM('InPerson', 'Online', 'Proxy');--> statement-breakpoint
CREATE TYPE "public"."waiting_state" AS ENUM('Waiting', 'Admitted', 'Declined', 'Kicked');--> statement-breakpoint
CREATE TABLE "preferential_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidateId" uuid NOT NULL,
	"voterId" uuid NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "unique_preferential_vote" UNIQUE("candidateId","id","rank")
);
--> statement-breakpoint
CREATE TABLE "question_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"questionId" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"format" "question_format" NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"roomId" uuid NOT NULL,
	"maxElected" integer DEFAULT 1 NOT NULL,
	"votersPresentAtEnd" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adminKey" text NOT NULL,
	"name" text NOT NULL,
	"shortId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"closedAt" timestamp (3),
	CONSTRAINT "rooms_shortId_unique" UNIQUE("shortId")
);
--> statement-breakpoint
CREATE TABLE "room_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"votingKey" uuid DEFAULT gen_random_uuid() NOT NULL,
	"state" "waiting_state" DEFAULT 'Waiting' NOT NULL,
	"roomId" uuid NOT NULL,
	"studentEmail" text NOT NULL,
	"location" "user_location" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "single_candidate_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidateId" uuid NOT NULL,
	"voterId" uuid NOT NULL,
	CONSTRAINT "unique_single_candidate_vote" UNIQUE("id","id")
);
--> statement-breakpoint
CREATE TABLE "user_question_interactions" (
	"userId" uuid NOT NULL,
	"questionId" uuid NOT NULL,
	"lastInteractedAt" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "user_question_interactions_userId_questionId_pk" PRIMARY KEY("userId","questionId")
);
--> statement-breakpoint
ALTER TABLE "preferential_votes" ADD CONSTRAINT "preferential_votes_candidateId_question_candidates_id_fk" FOREIGN KEY ("candidateId") REFERENCES "public"."question_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferential_votes" ADD CONSTRAINT "preferential_votes_voterId_room_users_id_fk" FOREIGN KEY ("voterId") REFERENCES "public"."room_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_candidates" ADD CONSTRAINT "question_candidates_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_roomId_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_users" ADD CONSTRAINT "room_users_roomId_rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "single_candidate_votes" ADD CONSTRAINT "single_candidate_votes_candidateId_question_candidates_id_fk" FOREIGN KEY ("candidateId") REFERENCES "public"."question_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "single_candidate_votes" ADD CONSTRAINT "single_candidate_votes_voterId_room_users_id_fk" FOREIGN KEY ("voterId") REFERENCES "public"."room_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_interactions" ADD CONSTRAINT "user_question_interactions_userId_room_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."room_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_question_interactions" ADD CONSTRAINT "user_question_interactions_questionId_questions_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_room_short_id" ON "rooms" USING btree ("shortId");--> statement-breakpoint
CREATE UNIQUE INDEX "room_voting_key" ON "room_users" USING btree ("votingKey");--> statement-breakpoint
CREATE INDEX "idx_room_id" ON "room_users" USING btree ("roomId");