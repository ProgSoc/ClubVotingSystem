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

export const voter = pgTable("Voter", {
	id: text("id").primaryKey().notNull(),
});

export const questionCandidate = pgTable("QuestionCandidate", {
	id: text("id").primaryKey().notNull(),
	name: text("name").notNull(),
	questionId: text("questionId").references(() => question.id, { onDelete: "set null", onUpdate: "cascade" } ),
});

export const question = pgTable("Question", {
	id: text("id").primaryKey().notNull(),
	question: text("question").notNull(),
	closed: boolean("closed").default(false).notNull(),
	createdAt: timestamp("createdAt", { precision: 3, mode: 'string' }).defaultNow().notNull(),
	roomId: text("roomId").notNull().references(() => room.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	format: questionType("format").notNull(),
	votersPresentAtEnd: integer("votersPresentAtEnd").default(0).notNull(),
});

export const questionInteraction = pgTable("QuestionInteraction", {
	questionId: text("questionId").notNull().references(() => question.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	voterId: text("voterId").notNull().references(() => voter.id, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => {
	return {
		questionInteractionPkey: primaryKey(table.questionId, table.voterId)
	}
});

export const candidateVote = pgTable("CandidateVote", {
	candidateId: text("candidateId").notNull().references(() => questionCandidate.id, { onDelete: "restrict", onUpdate: "cascade" } ),
	voterId: text("voterId").notNull().references(() => voter.id, { onDelete: "restrict", onUpdate: "cascade" } ),
},
(table) => {
	return {
		candidateVotePkey: primaryKey(table.candidateId, table.voterId)
	}
});