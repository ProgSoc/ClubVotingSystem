import type { QuestionType } from '@prisma/client';

export type RoomPublicInfo = {
  id: string;
  shortId: string;
  name: string;
  createdAt: string;
  closedAt: string | null;
};

export type RoomAdminInfo = RoomPublicInfo & {
  adminKey: string;
};

export interface SingleVoteQuestionFormat {
  type: typeof QuestionType['SingleVote'];
}

export type QuestionFormatDetails = SingleVoteQuestionFormat;

export type CreateQuestionParams = {
  question: string;
  candidates: string[];
  details: QuestionFormatDetails;
};
