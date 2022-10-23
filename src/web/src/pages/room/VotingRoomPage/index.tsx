import type { ShowingResultsState } from '@server/live-room/live-states';
import type { PublicStaticRoomData } from '@server/rooms';
import { ResultsViewer } from 'components/ResultsViewer';
import { Button, CenteredPageContainer, Heading, Question } from 'components/styles';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { routeBuilders } from 'routes';
import { twMerge } from 'tailwind-merge';

import type { QuestionVotingData } from './hooks';
import { VotingPageState } from './hooks';
import { useVoterState } from './hooks';

export function VotingRoomPage(props: { roomId: string; userId: string; room: PublicStaticRoomData; voterId: string }) {
  const data = useVoterState(props);

  // Navigate to waiting room if the user was kicked
  const navigate = useNavigate();
  useEffect(() => {
    if (VotingPageState.is.kicked(data)) {
      navigate(
        routeBuilders.waitInWaitingRoom({
          roomId: props.roomId,
          userId: props.userId,
        })
      );
    }
  }, [VotingPageState.is.kicked(data)]);

  return (
    <CenteredPageContainer className="pt-32 sm:pt-4">
      <QuestionVoter data={data} />
    </CenteredPageContainer>
  );
}

function QuestionVoter({ data }: { data: VotingPageState }) {
  return VotingPageState.match(data, {
    loading: () => <Heading>Loading...</Heading>,
    waiting: () => <Heading>Waiting for question</Heading>,
    ended: () => <Heading>Ended</Heading>,
    voting: (data) => <QuestionVoting data={data} />,
    viewingResults: (data) => <ViewingResults data={data} />,
    kicked: () => <></>,
  });
}

function QuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  const reorder = useMemo(() => {
    const indexes = Array.from({ length: data.question.candidates.length }, (_, i) => i);

    // Randomly reorder indexes array
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    return indexes;
  }, [data.question.questionId]);

  const candidatesReordered = question.candidates.map((_, i) => question.candidates[reorder[i]]);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <Question>{question.question}</Question>
      <div className="flex gap-4 flex-wrap flex-col sm:flex-row items-stretch sm:items-center justify-center w-full">
        {candidatesReordered.map((candidate) => (
          <Button
            className={twMerge(
              lastVote?.type === 'SingleVote' && lastVote.candidateId === candidate.id && 'btn-accent'
            )}
            key={candidate.id}
            onClick={() => {
              castVote({
                type: 'SingleVote',
                candidateId: candidate.id,
              });
            }}
          >
            {candidate.name}
          </Button>
        ))}
        <Button
          className={twMerge(data.lastVote?.type === 'Abstain' ? 'btn-accent' : 'btn-outline')}
          onClick={() => {
            castVote({
              type: 'Abstain',
            });
          }}
        >
          Abstain
        </Button>
      </div>
    </div>
  );
}

function ViewingResults({ data }: { data: ShowingResultsState }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <Question>{data.question}</Question>
      <ResultsViewer results={data.results} />
    </div>
  );
}
