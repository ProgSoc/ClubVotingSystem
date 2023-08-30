import type { QuestionResponse } from '@server/live/question';
import type { ShowingQuestionState, ShowingResultsState } from '@server/live/states';
import { VoterState } from '@server/live/states';
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
  kicked: state<{}>(),
});

interface LastVote {
  questionId: string;
  response: QuestionResponse;
}

export function useVoterState(props: { roomId: string; voterId: string }): VotingPageState {
  const [state, setState] = useState<VoterState | null>(null);
  const [lastVote, setLastVote] = useState<LastVote | null>(null);
  const voteLock = useRef<Promise<void>>(Promise.resolve());

  const castVoteMutation = trpc.vote.castVote.useMutation();

  const runSyncAsync = async (fn: () => Promise<void>) => {
    const promise = voteLock.current.catch(() => {}).then(fn);
    voteLock.current = promise;
    await promise;
  };

  trpc.vote.listen.useSubscription(
    { roomId: props.roomId, voterId: props.voterId },
    {
      onData: (data) => {
        setState(data);
      },
      onError: (err) => {
        console.error(err);
      },
    }
  );

  const { isInitialVoteLoading } = useFetchInitialVote(props, state, setLastVote);

  if (!state) {
    return VotingPageState.loading({});
  }

  return VoterState.match<VotingPageState>(state, {
    blank: () => VotingPageState.waiting({}),
    ended: () => VotingPageState.ended({}),
    kicked: () => VotingPageState.kicked({}),

    showingResults: (state) => VotingPageState.viewingResults(state),

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
  });
}

type InitialVoteFetchState = GetStatesUnion<typeof InitialVoteFetchState.enum>;
const InitialVoteFetchState = makeStates('ivfs', {
  waitingForVoterState: state<{}>(),
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
  voterState: VoterState | null,
  setLastVote: (vote: LastVote | null) => void
) {
  const [fetchState, setFetchState] = useState<InitialVoteFetchState>(InitialVoteFetchState.waitingForVoterState({}));

  const initialVoteQuery = trpc.vote.getMyVote.useQuery(
    {
      roomId: props.roomId,
      voterId: props.voterId,

      // If we're not fetching, then the query is disabled anyway and this arg doesnt matter
      questionId: InitialVoteFetchState.is.fetching(fetchState) ? fetchState.questionId : '',
    },
    {
      enabled: InitialVoteFetchState.is.fetching(fetchState),
    }
  );

  useEffect(() => {
    if (InitialVoteFetchState.is.waitingForVoterState(fetchState) && voterState) {
      if (VoterState.is.showingQuestion(voterState)) {
        setFetchState(InitialVoteFetchState.fetching({ questionId: voterState.questionId }));
      } else {
        setFetchState(InitialVoteFetchState.ignoring({}));
      }
    }
  }, [voterState]);

  useEffect(() => {
    if (initialVoteQuery.data !== undefined && InitialVoteFetchState.is.fetching(fetchState) && voterState) {
      if (VoterState.is.showingQuestion(voterState) && voterState.questionId === fetchState.questionId) {
        setFetchState(InitialVoteFetchState.fetched({}));
        setLastVote(initialVoteQuery.data && { questionId: voterState.questionId, response: initialVoteQuery.data });
      } else {
        setFetchState(InitialVoteFetchState.ignoring({}));
      }
    }
  }, [initialVoteQuery.data]);

  return {
    // We're loading if we're waiting for the board state, or if we're fetching
    isInitialVoteLoading:
      InitialVoteFetchState.is.waitingForVoterState(fetchState) || InitialVoteFetchState.is.fetching(fetchState),
  };
}
