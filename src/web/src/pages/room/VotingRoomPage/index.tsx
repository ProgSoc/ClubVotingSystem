import type { ShowingResultsState } from '@server/live/states';
import type { RoomPublicInfo } from '@server/room/types';
import { ResultsViewer } from 'components/ResultsViewer';
import { Button, CenteredPageContainer, Heading, Question } from 'components/styles';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { routeBuilders } from 'routes';
import { Reorder } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

import { questionResponse } from '@server/live/question';
import { Controller } from 'react-hook-form';
import useZodForm from '../../../hooks/useZodForm';
import type { QuestionVotingData } from './hooks';
import { VotingPageState, useVoterState } from './hooks';

export function VotingRoomPage(props: { roomId: string; userId: string; room: RoomPublicInfo; votingKey: string }) {
  const data = useVoterState(props);

  // Navigate to waiting room if the user was kicked
  const navigate = useNavigate();
  useEffect(() => {
    if (VotingPageState.is.kicked(data)) {
      navigate(
        routeBuilders.waitInWaitingRoom({
          roomId: props.roomId,
          userId: props.userId,
        }),
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
    voting: data => <QuestionVoting data={data} />,
    viewingResults: data => <ViewingResults data={data} />,
    kicked: () => <></>,
  });
}

function QuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  const { control, handleSubmit, reset, setValue } = useZodForm({
    schema: questionResponse,
    defaultValues: lastVote,
  });

  const onSubmit = handleSubmit(async (data) => {
    switch (data.type) {
      case 'Abstain':
        castVote({ type: 'Abstain' });
        break;
      case 'SingleVote':
        castVote({
          type: 'SingleVote',
          candidateId: data.candidateId,
        });
        break;
      case 'PreferentialVote':
        castVote({
          candidateIds: data.candidateIds,
          type: 'PreferentialVote',
        });
        break;
    }
  });

  // const reorder = useMemo(() => {
  //   const indexes = Array.from({ length: data.question.candidates.length }, (_, i) => i);

  //   // Randomly reorder indexes array
  //   for (let i = indexes.length - 1; i > 0; i--) {
  //     const j = Math.floor(Math.random() * (i + 1));
  //     [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  //   }

  //   return indexes;
  // }, [data.question.questionId]);

  // const candidatesReordered = useMemo(() => question.candidates.map((_, i) => question.candidates[reorder[i]]), [reorder]);

  // const [candidateOrder, setCandidateOrder] = useState<VotingCandidate[]>(candidatesReordered);

  // useEffect(() => {
  //   setCandidateOrder(candidatesReordered);
  // }, [candidatesReordered]);

  // const debounced = useDebounceCallback((votingCandidates: VotingCandidate[]) => {
  //   castVote({
  //     type: 'PreferentialVote',
  //     candidateIds: votingCandidates.map(candidate => candidate.id),
  //   });
  // }, 500);

  // const onReorder = (unknownVotingCandidates: unknown[]) => {
  //   const votingCandidates = unknownVotingCandidates as VotingCandidate[];
  //   debounced(votingCandidates);

  //   setCandidateOrder(votingCandidates);
  // };

  useEffect(() => {
    if (lastVote) {
      reset(lastVote);
    }
  }, [lastVote]);

  return (
    <form className="flex flex-col items-center gap-6 w-full">
      <Question>{question.question}</Question>
      <div className="flex gap-4 flex-wrap flex-col items-stretch justify-center w-full">
        {question.details.type === 'SingleVote'
          ? question.candidates.map(candidate => (
            <Controller
              name="candidateId"
              control={control}
              key={candidate.id}
              render={({ field: { value, onChange } }) => (
                <Button
                  className={twMerge(
                    value === candidate.id ? 'btn-accent' : undefined,
                  )}
                  onClick={() => {
                    setValue('type', 'SingleVote');
                    onChange(candidate.id);
                    onSubmit();
                  }}
                >
                  {candidate.name}
                </Button>
              )}
            />
          ))
          : (
              <Controller
                name="candidateIds"
                control={control}
                defaultValue={question.candidates.map(({ id }) => id)}
                render={({ field: { value, onChange } }) => (
                  <Reorder.Group
                    values={value}
                    onReorder={(v) => {
                      setValue('type', 'PreferentialVote');
                      onChange(v);
                      onSubmit();
                    }}
                    className="flex flex-col gap-2"
                  >
                    {value.map((id, index) => (
                      <Reorder.Item key={id} value={id}>
                        <span className={twMerge('btn', lastVote?.type === 'PreferentialVote' ? 'btn-accent' : 'btn-outline')}>
                          {`${index + 1}. ${question.candidates.find(candidate => candidate.id === id)?.name}`}
                        </span>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              />

            )}
        <Controller
          name="type"
          control={control}
          render={({ field: { value, onChange } }) => (
            <div className="flex justify-center">
              <Button
                className={twMerge(value === 'Abstain' ? 'btn-accent' : 'btn-outline')}
                onClick={() => {
                  onChange('Abstain');
                  onSubmit();
                }}
              >
                Abstain
              </Button>
            </div>
          )}
        />

      </div>
    </form>
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
