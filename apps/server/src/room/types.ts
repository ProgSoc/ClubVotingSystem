import type { QuestionFormatEnum } from "@/db/types";

export interface RoomPublicInfo {
	id: string;
	shortId: string;
	name: string;
	createdAt: string;
	closedAt: string | null;
}

export type RoomAdminInfo = RoomPublicInfo & {
	adminKey: string;
};

export interface SingleVoteQuestionFormat {
	type: Extract<QuestionFormatEnum, "SingleVote">;
}

export interface PreferentialVoteQuestionFormat {
	type: Extract<QuestionFormatEnum, "PreferentialVote">;
	maxElected: number;
}

export type QuestionFormatDetails =
	| SingleVoteQuestionFormat
	| PreferentialVoteQuestionFormat;

export interface CreateQuestionParams {
	question: string;
	candidates: string[];
	details: QuestionFormatDetails;
}
