import type { ShowingQuestionState, ShowingResultsState } from '@server/live-room/live-states';
import { BoardState } from '@server/live-room/live-states';
import type { QuestionResponse } from '@server/live-room/question';
import { useEffect, useRef, useState } from 'react';
import { trpc } from 'utils/trpc';

interface LoadingState {
  type: 'loading';
}

interface WaitingState {
  type: 'waiting';
}

interface EndedState {
  type: 'ended';
}

export interface ViewingResultsData {
  type: 'viewing-results';
  question: ShowingResultsState;
}

export interface QuestionVotingData {
  type: 'question-voting';
  question: ShowingQuestionState;
  lastVote?: QuestionResponse;
  castVote(params: QuestionResponse): void;
}

export type VotingPageState = ViewingResultsData | QuestionVotingData | WaitingState | LoadingState | EndedState;

interface LastVote {
  questionId: string;
  response: QuestionResponse;
}

export function useVoterState(props: { roomId: string; voterId: string }): VotingPageState {
  const [state, setState] = useState<BoardState | null>(null);
  const [lastVote, setLastVote] = useState<LastVote | null>(null);
  const voteLock = useRef<Promise<void>>(Promise.resolve());

  const castVoteMutation = trpc.useMutation(['vote.castVote']);

  const runSyncAsync = async (fn: () => Promise<void>) => {
    const promise = voteLock.current.then(fn);
    voteLock.current = promise;
    await promise;
  };

  trpc.useSubscription(['room.listenBoardEvents', { roomId: props.roomId }], {
    onNext: (data) => {
      setState(data);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  const { isInitialVoteLoading } = useFetchInitialVote(props, state, setLastVote);

  if (!state) {
    return {
      type: 'loading',
    };
  }

  return BoardState.match<VotingPageState>(state, {
    blank: () => {
      return {
        type: 'waiting',
      };
    },

    showingQuestion: (state) => {
      if (isInitialVoteLoading) {
        return {
          type: 'loading',
        };
      }

      const castVote = (response: QuestionResponse) => {
        void runSyncAsync(async () => {
          await castVoteMutation.mutateAsync({
            questionId: state.questionId,
            roomId: props.roomId,
            voterId: props.voterId,
            response,
          });
        });
        setLastVote({
          questionId: state.questionId,
          response,
        });
      };

      return {
        type: 'question-voting',
        question: state,
        lastVote: lastVote?.questionId === state.questionId ? lastVote.response : undefined,
        castVote,
      };
    },

    showingResults: (state) => {
      return {
        type: 'viewing-results',
        question: state,
      };
    },

    ended: () => {
      return {
        type: 'ended',
      };
    },
  });
}

type WithType<Type, T = {}> = T & { type: Type };

enum InitialVoteFetchType {
  WaitingForBoardState,
  Ignoring,
  Fetching,
  Fetched,
}

type InitialVoteFetchState =
  | WithType<InitialVoteFetchType.WaitingForBoardState>
  | WithType<InitialVoteFetchType.Ignoring>
  | WithType<InitialVoteFetchType.Fetching, { questionId: string }>
  | WithType<InitialVoteFetchType.Fetched>;

/**
 * Fetch the initial voting state from the server, in case the voter has
 * already voted for this question and then refreshed the page.
 *
 * Return whether the initial vote is still loading. When loaded, it calls
 * the `setLastVote` callback with the last vote.
 */
function useFetchInitialVote(
  props: { roomId: string; voterId: string },
  boardState: BoardState | null,
  setLastVote: (vote: LastVote | null) => void
) {
  const [fetchInitialVoteState, setFetchInitialVoteState] = useState<InitialVoteFetchState>({
    type: InitialVoteFetchType.WaitingForBoardState,
  });

  const initialVoteQuery = trpc.useQuery(
    [
      'vote.getMyVote',
      {
        roomId: props.roomId,
        voterId: props.voterId,

        // If we're not fetching, then the query is disabled anyway and this arg doesnt matter
        questionId:
          fetchInitialVoteState.type === InitialVoteFetchType.Fetching ? fetchInitialVoteState.questionId : '',
      },
    ],
    {
      enabled: fetchInitialVoteState.type === InitialVoteFetchType.Fetching,
    }
  );

  useEffect(() => {
    if (fetchInitialVoteState.type === InitialVoteFetchType.WaitingForBoardState && boardState) {
      if (BoardState.is.showingQuestion(boardState)) {
        setFetchInitialVoteState({ type: InitialVoteFetchType.Fetching, questionId: boardState.questionId });
      } else {
        setFetchInitialVoteState({ type: InitialVoteFetchType.Ignoring });
      }
    }
  }, [boardState]);

  useEffect(() => {
    if (
      initialVoteQuery.data !== undefined &&
      fetchInitialVoteState.type === InitialVoteFetchType.Fetching &&
      boardState
    ) {
      if (BoardState.is.showingQuestion(boardState) && boardState.questionId === fetchInitialVoteState.questionId) {
        setFetchInitialVoteState({ type: InitialVoteFetchType.Fetched });
        setLastVote(initialVoteQuery.data && { questionId: boardState.questionId, response: initialVoteQuery.data });
      } else {
        setFetchInitialVoteState({ type: InitialVoteFetchType.Ignoring });
      }
    }
  }, [initialVoteQuery.data]);

  return {
    // We're loading if we're waiting for the board state, or if we're fetching
    isInitialVoteLoading: [InitialVoteFetchType.WaitingForBoardState, InitialVoteFetchType.Fetching].includes(
      fetchInitialVoteState.type
    ),
  };
}
