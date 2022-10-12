import type { ShowingQuestionState, ShowingResultsState } from '@server/live-room/live-states';
import { BoardState } from '@server/live-room/live-states';
import type { QuestionResponse } from '@server/live-room/question';
import type { GetStatesUnion } from '@server/state';
import { makeStates, state } from '@server/state';
import { useEffect, useRef, useState } from 'react';
import { trpc } from 'utils/trpc';

export interface QuestionVotingData {
  question: ShowingQuestionState;
  lastVote?: QuestionResponse;
  castVote(params: QuestionResponse): void;
}

export type VotingPageState = GetStatesUnion<typeof VotingPageState.enum>;
export const VotingPageState = makeStates('vps', {
  loading: state<{}>(),
  waiting: state<{}>(),
  ended: state<{}>(),
  viewingResults: state<ShowingResultsState>(),
  voting: state<QuestionVotingData>(),
});

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
    return VotingPageState.loading({});
  }

  return BoardState.match<VotingPageState>(state, {
    blank: () => {
      return VotingPageState.waiting({});
    },

    showingQuestion: (state) => {
      if (isInitialVoteLoading) {
        return VotingPageState.loading({});
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

      return VotingPageState.voting({
        question: state,
        lastVote: lastVote?.questionId === state.questionId ? lastVote.response : undefined,
        castVote,
      });
    },

    showingResults: (state) => {
      return VotingPageState.viewingResults(state);
    },

    ended: () => {
      return VotingPageState.ended({});
    },
  });
}

type InitialVoteFetchState = GetStatesUnion<typeof InitialVoteFetchState.enum>;
const InitialVoteFetchState = makeStates('ivfs', {
  waitingForBoardState: state<{}>(),
  ignoring: state<{}>(),
  fetching: state<{ questionId: string }>(),
  fetched: state<{}>(),
});

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
  const [fetchState, setFetchState] = useState<InitialVoteFetchState>(InitialVoteFetchState.waitingForBoardState({}));

  const initialVoteQuery = trpc.useQuery(
    [
      'vote.getMyVote',
      {
        roomId: props.roomId,
        voterId: props.voterId,

        // If we're not fetching, then the query is disabled anyway and this arg doesnt matter
        questionId: InitialVoteFetchState.is.fetching(fetchState) ? fetchState.questionId : '',
      },
    ],
    {
      enabled: InitialVoteFetchState.is.fetching(fetchState),
    }
  );

  useEffect(() => {
    if (InitialVoteFetchState.is.waitingForBoardState(fetchState) && boardState) {
      if (BoardState.is.showingQuestion(boardState)) {
        setFetchState(InitialVoteFetchState.fetching({ questionId: boardState.questionId }));
      } else {
        setFetchState(InitialVoteFetchState.ignoring({}));
      }
    }
  }, [boardState]);

  useEffect(() => {
    if (initialVoteQuery.data !== undefined && InitialVoteFetchState.is.fetching(fetchState) && boardState) {
      if (BoardState.is.showingQuestion(boardState) && boardState.questionId === fetchState.questionId) {
        setFetchState(InitialVoteFetchState.fetched({}));
        setLastVote(initialVoteQuery.data && { questionId: boardState.questionId, response: initialVoteQuery.data });
      } else {
        setFetchState(InitialVoteFetchState.ignoring({}));
      }
    }
  }, [initialVoteQuery.data]);

  return {
    // We're loading if we're waiting for the board state, or if we're fetching
    isInitialVoteLoading:
      InitialVoteFetchState.is.waitingForBoardState(fetchState) || InitialVoteFetchState.is.fetching(fetchState),
  };
}
