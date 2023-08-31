import { InferInsertModel, InferSelectModel } from "drizzle-orm"
import { candidateVote, question, questionCandidate, questionInteraction, room, roomUser, voter } from "../schema"

type SelectRoomUser = InferSelectModel<typeof roomUser>
type InsertRoomUser = InferInsertModel<typeof roomUser>

type SelectRoom = InferSelectModel<typeof room>
type InsertRoom = InferInsertModel<typeof room>

type InsertVoter = InferInsertModel<typeof voter>
type SelectVoter = InferSelectModel<typeof voter>

type InsertQuestionCandidate = InferInsertModel<typeof questionCandidate>
type SelectQuestionCandidate = InferSelectModel<typeof questionCandidate>

type InsertQuestion = InferInsertModel<typeof question>
type SelectQuestion = InferSelectModel<typeof question>

type InsertQuestionInteraction = InferInsertModel<typeof questionInteraction>
type SelectQuestionInteraction = InferSelectModel<typeof questionInteraction>

type InsertCandidateVote = InferInsertModel<typeof candidateVote>
type SelectCandidateVote = InferSelectModel<typeof candidateVote>

export type {
  SelectRoomUser,
  InsertRoomUser,
  SelectRoom,
  InsertRoom,
  InsertVoter,
  SelectVoter,
  InsertQuestionCandidate,
  SelectQuestionCandidate,
  InsertQuestion,
  SelectQuestion,
  InsertQuestionInteraction,
  SelectQuestionInteraction,
  InsertCandidateVote,
  SelectCandidateVote,
}
