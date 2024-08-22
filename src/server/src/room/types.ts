import type { QuestionFormat } from '../dbschema/interfaces';

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
  type: Extract<QuestionFormat, 'SingleVote'>;
}

export interface PreferentialVoteQuestionFormat {
  type: Extract<QuestionFormat, 'PreferentialVote'>;
}

export type QuestionFormatDetails = SingleVoteQuestionFormat | PreferentialVoteQuestionFormat;

export interface CreateQuestionParams {
  question: string;
  candidates: string[];
  details: QuestionFormatDetails;
}
