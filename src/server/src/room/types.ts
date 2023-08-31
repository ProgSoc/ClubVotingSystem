import { questionType } from "@/db/schema";

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
  type: typeof questionType.enumValues[number];
}

export type QuestionFormatDetails = SingleVoteQuestionFormat;

export type CreateQuestionParams = {
  question: string;
  candidates: string[];
  details: QuestionFormatDetails;
};
