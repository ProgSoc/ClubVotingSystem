import { relations } from "drizzle-orm";
import { pgTable, pgEnum, varchar, timestamp, text, integer, uniqueIndex, foreignKey, boolean, primaryKey } from "drizzle-orm/pg-core"

export const waitingState = pgEnum("WaitingState", ['Kicked', 'Declined', 'Admitted', 'Waiting'])
export const userLocation = pgEnum("UserLocation", ['Proxy', 'Online', 'InPerson'])
export const questionType = pgEnum("QuestionType", ['SingleVote'])

export const roomUser = pgTable("RoomUser", {
	id: text("id").primaryKey().notNull(),
	studentEmail: text("studentEmail").notNull(),
	state: waitingState("state").notNull(),
	roomId: text("roomId").notNull().references(() => room.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	voterId: text("voterId").references(() => voter.id, { onDelete: "set null", onUpdate: "cascade" } ),
	location: userLocation("location").notNull(),
},
(table) => {
	return {
		voterIdKey: uniqueIndex("RoomUser_voterId_key").on(table.voterId),
	}
});

export const roomUserRelations = relations(roomUser, ({one, many}) => ({
	room: one(room, {
		fields: [roomUser.roomId],
		references: [room.id],
	}),
	voter: one(voter, {
		fields: [roomUser.voterId],
		references: [voter.id],
	}),
}))

export const room = pgTable("Room", {
	id: text("id").primaryKey().notNull(),
	shortId: text("shortId").notNull(),
	adminKey: text("adminKey").notNull(),
	name: text("name").notNull(),
	createdAt: timestamp("createdAt", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	closedAt: timestamp("closedAt", { precision: 3, mode: 'string' }),
},
(table) => {
	return {
		shortIdKey: uniqueIndex("Room_shortId_key").on(table.shortId),
	}
});

export const roomRelations = relations(room, ({one, many}) => ({
	roomUsers: many(roomUser),
	questions: many(question),
}))

export const voter = pgTable("Voter", {
	id: text("id").primaryKey().notNull(),
});

export const voterRelations = relations(voter, ({one, many}) => ({
	roomUser: one(roomUser, {
		fields: [voter.id],
		references: [roomUser.voterId],
	}),
	questionInteractions: many(questionInteraction),
	candidateVotes: many(candidateVote),
}))

export const questionCandidate = pgTable("QuestionCandidate", {
	id: text("id").primaryKey().notNull(),
	name: text("name").notNull(),
	questionId: text("questionId").references(() => question.id, { onDelete: "set null", onUpdate: "cascade" } ),
});

export const questionCandidateRelations = relations(questionCandidate, ({one, many}) => ({
	question: one(question, {
		fields: [questionCandidate.questionId],
		references: [question.id],
	}),
	candidateVotes: many(candidateVote),
}))

export const question = pgTable("Question", {
	id: text("id").primaryKey().notNull(),
	question: text("question").notNull(),
	closed: boolean("closed").default(false).notNull(),
	createdAt: timestamp("createdAt", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	roomId: text("roomId").notNull().references(() => room.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	format: questionType("format").notNull(),
	votersPresentAtEnd: integer("votersPresentAtEnd").default(0).notNull(),
});

export const questionRelations = relations(question, ({one, many}) => ({
	room: one(room, {
		fields: [question.roomId],
		references: [room.id],
	}),
	questionCandidates: many(questionCandidate),
	questionInteractions: many(questionInteraction),
	candidateVotes: many(candidateVote),
}))

export const questionInteraction = pgTable("QuestionInteraction", {
	questionId: text("questionId").notNull().references(() => question.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	voterId: text("voterId").notNull().references(() => voter.id, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => {
	return {
		questionInteractionPkey: primaryKey(table.questionId, table.voterId)
	}
});

export const questionInteractionRelations = relations(questionInteraction, ({one, many}) => ({
	question: one(question, {
		fields: [questionInteraction.questionId],
		references: [question.id],
	}),
	voter: one(voter, {
		fields: [questionInteraction.voterId],
		references: [voter.id],
	}),
}))

export const candidateVote = pgTable("CandidateVote", {
	candidateId: text("candidateId").notNull().references(() => questionCandidate.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	voterId: text("voterId").notNull().references(() => voter.id, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => {
	return {
		candidateVotePkey: primaryKey(table.candidateId, table.voterId)
	}
});

export const candidateVoteRelations = relations(candidateVote, ({one, many}) => ({
	candidate: one(questionCandidate, {
		fields: [candidateVote.candidateId],
		references: [questionCandidate.id],
	}),
	voter: one(voter, {
		fields: [candidateVote.voterId],
		references: [voter.id],
	}),
}))