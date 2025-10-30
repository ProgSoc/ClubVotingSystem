import type {
	preferentialCandidateVoteTable,
	questionCandidateTable,
	questionFormatEnum,
	questionTable,
	roomTable,
	roomUserTable,
	singleCandidateVoteTable,
	userLocationEnum,
	waitingStateEnum,
} from "./schema";

export type RoomUserSelect = typeof roomUserTable.$inferSelect;
export type RoomUserInsert = typeof roomUserTable.$inferInsert;

export type RoomSelect = typeof roomTable.$inferSelect;
export type RoomInsert = typeof roomTable.$inferInsert;

export type QuestionSelect = typeof questionTable.$inferSelect;
export type QuestionInsert = typeof questionTable.$inferInsert;

export type QuestionCandidateSelect =
	typeof questionCandidateTable.$inferSelect;
export type QuestionCandidateInsert =
	typeof questionCandidateTable.$inferInsert;

export type SingleCandidateVoteSelect =
	typeof singleCandidateVoteTable.$inferSelect;
export type SingleCandidateVoteInsert =
	typeof singleCandidateVoteTable.$inferInsert;

export type PreferentialCandidateVoteSelect =
	typeof preferentialCandidateVoteTable.$inferSelect;
export type PreferentialCandidateVoteInsert =
	typeof preferentialCandidateVoteTable.$inferInsert;

export type VoterStateEnum = (typeof waitingStateEnum.enumValues)[number];

export type QuestionFormatEnum = (typeof questionFormatEnum.enumValues)[number];

export type UserLocationEnum = (typeof userLocationEnum.enumValues)[number];
