import { QuestionFormat } from "../dbschema/interfaces";

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
  type: Extract<QuestionFormat, 'SingleVote'>;
}

export type QuestionFormatDetails = SingleVoteQuestionFormat;

export type CreateQuestionParams = {
  question: string;
  candidates: string[];
  details: QuestionFormatDetails;
};
