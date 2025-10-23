import type { GetStatesUnion } from "../state";
import { makeStates, state } from "../state";
import type { QuestionFormatDetails, ResultsView } from "./question";

export interface VotingCandidate {
	id: string;
	name: string;
}

interface OpenRoomBaseState {
	totalPeople: number;
}

export interface BlankRoomState extends OpenRoomBaseState {}

export interface ShowingQuestionState extends OpenRoomBaseState {
	questionId: string;
	question: string;
	details: QuestionFormatDetails;
	peopleVoted: number;
	candidates: VotingCandidate[];
}

export interface ShowingResultsState
	extends ShowingQuestionState,
		OpenRoomBaseState {
	results: ResultsView;
}

function makePartial<T>(args: T): Partial<T> {
	return args;
}
export const TestType = makePartial({ foo: 1, bar: 2 });

export type BoardState = GetStatesUnion<typeof BoardState.enum>;
export const BoardState = makeStates("bs", {
	blank: state<BlankRoomState>(),
	showingQuestion: state<ShowingQuestionState>(),
	showingResults: state<ShowingResultsState>(),
	ended: state<{}>(),
});

export type VoterState = GetStatesUnion<typeof VoterState.enum>;
export const VoterState = makeStates("vs", {
	blank: state<BlankRoomState>(),
	showingQuestion: state<ShowingQuestionState>(),
	showingResults: state<ShowingResultsState>(),
	ended: state<{}>(),
	kicked: state<{}>(),
});
