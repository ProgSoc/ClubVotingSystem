import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const userLocationEnum = pgEnum("user_location", [
	"InPerson",
	"Online",
	"Proxy",
]);

export const waitingStateEnum = pgEnum("waiting_state", [
	"Waiting",
	"Admitted",
	"Declined",
	"Kicked",
]);

export const questionFormatEnum = pgEnum("question_format", [
	"SingleVote",
	"PreferentialVote",
]);

export const roomTable = pgTable(
	"rooms",
	{
		id: uuid().defaultRandom().primaryKey(),
		adminKey: text().notNull(),
		name: text().notNull(),
		shortId: text().notNull().unique(),
		createdAt: timestamp({ mode: "date", precision: 3 }).defaultNow().notNull(),
		closedAt: timestamp({ mode: "date", precision: 3 }),
	},
	(table) => [uniqueIndex("unique_room_short_id").on(table.shortId)],
);

export const roomTableRelations = relations(roomTable, ({ many }) => ({
	users: many(roomUserTable),
	questions: many(questionTable),
}));

export const roomUserTable = pgTable(
	"room_users",
	{
		id: uuid().defaultRandom().primaryKey(),
		votingKey: uuid().defaultRandom().notNull(),
		state: waitingStateEnum().default("Waiting").notNull(),
		roomId: uuid()
			.notNull()
			.references(() => roomTable.id),
		studentEmail: text().notNull(),
		location: userLocationEnum().notNull(),
	},
	(table) => [
		uniqueIndex("room_voting_key").on(table.votingKey),
		index("idx_room_id").on(table.roomId),
	],
);

export const roomUserTableRelations = relations(
	roomUserTable,
	({ one, many }) => ({
		room: one(roomTable, {
			fields: [roomUserTable.roomId],
			references: [roomTable.id],
		}),
		singleCandidateVotes: many(singleCandidateVoteTable),
		preferentialCandidateVotes: many(preferentialCandidateVoteTable),
		questionInteractions: many(userQuestionInteractionTable),
	}),
);

export const userQuestionInteractionTable = pgTable(
	"user_question_interactions",
	{
		userId: uuid()
			.notNull()
			.references(() => roomUserTable.id),
		questionId: uuid()
			.notNull()
			.references(() => questionTable.id),
		lastInteractedAt: timestamp({ mode: "date", precision: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.userId, table.questionId] })],
);

export const questionTable = pgTable("questions", {
	id: uuid().defaultRandom().primaryKey(),
	question: text().notNull(),
	format: questionFormatEnum().notNull(),
	closed: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: "date", precision: 3 }).defaultNow().notNull(),
	roomId: uuid()
		.notNull()
		.references(() => roomTable.id),
	maxElected: integer().notNull().default(1),
	votersPresentAtEnd: integer().notNull().default(0),
});

export const questionTableRelations = relations(
	questionTable,
	({ one, many }) => ({
		room: one(roomTable, {
			fields: [questionTable.roomId],
			references: [roomTable.id],
		}),
		candidates: many(questionCandidateTable),
		userInteractions: many(userQuestionInteractionTable),
	}),
);

export const singleCandidateVoteTable = pgTable(
	"single_candidate_votes",
	{
		id: uuid().defaultRandom().primaryKey(),
		candidateId: uuid()
			.notNull()
			.references(() => questionCandidateTable.id),
		voterId: uuid()
			.notNull()
			.references(() => roomUserTable.id),
	},
	() => [
		unique("unique_single_candidate_vote").on(
			roomUserTable.id,
			questionCandidateTable.id,
		),
	],
);

export const singleCandidateVoteTableRelations = relations(
	singleCandidateVoteTable,
	({ one }) => ({
		candidate: one(questionCandidateTable, {
			fields: [singleCandidateVoteTable.candidateId],
			references: [questionCandidateTable.id],
		}),
		voter: one(roomUserTable, {
			fields: [singleCandidateVoteTable.voterId],
			references: [roomUserTable.id],
		}),
	}),
);

export const preferentialCandidateVoteTable = pgTable(
	"preferential_votes",
	{
		id: uuid().defaultRandom().primaryKey(),
		candidateId: uuid()
			.notNull()
			.references(() => questionCandidateTable.id),
		voterId: uuid()
			.notNull()
			.references(() => roomUserTable.id),
		rank: integer().notNull(),
	},
	(table) => [
		unique("unique_preferential_vote").on(
			table.candidateId,
			table.id,
			table.rank, // A voter can't give the same rank to multiple candidates
		),
	],
);

export const preferentialCandidateVoteTableRelations = relations(
	preferentialCandidateVoteTable,
	({ one }) => ({
		candidate: one(questionCandidateTable, {
			fields: [preferentialCandidateVoteTable.candidateId],
			references: [questionCandidateTable.id],
		}),
		voter: one(roomUserTable, {
			fields: [preferentialCandidateVoteTable.id],
			references: [roomUserTable.id],
		}),
	}),
);

export const questionCandidateTable = pgTable("question_candidates", {
	id: uuid().defaultRandom().primaryKey(),
	questionId: uuid()
		.notNull()
		.references(() => questionTable.id),
});

export const questionCandidateTableRelations = relations(
	questionCandidateTable,
	({ one, many }) => ({
		question: one(questionTable, {
			fields: [questionCandidateTable.questionId],
			references: [questionTable.id],
		}),
		singleCandidateVotes: many(singleCandidateVoteTable),
		preferentialCandidateVotes: many(preferentialCandidateVoteTable),
	}),
);
