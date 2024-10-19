import type { ShowingResultsState } from '@server/live/states';
import type { RoomPublicInfo } from '@server/room/types';
import { ResultsViewer } from 'components/ResultsViewer';
import { Button, CenteredPageContainer, Heading, Question } from 'components/styles';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeBuilders } from 'routes';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

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

function randomizeArray<T>(array: T[]): T[] {
  const indexes = Array.from({ length: array.length }, (_, i) => i);

  // Randomly reorder indexes array
  for (let i = indexes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
  }

  return indexes.map(i => array[i]);
}

function SingleQuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  const { control, handleSubmit, reset } = useZodForm({
    schema: z.object({
      candidateId: z.string(),
    }),
    defaultValues: lastVote?.type === 'SingleVote' ? lastVote : undefined,
  });

  const candidatesReordered = useMemo(() => randomizeArray(question.candidates), [question.questionId]);

  const onSubmit = handleSubmit(async (data) => {
    castVote({
      type: 'SingleVote',
      candidateId: data.candidateId,
    });
  });

  useEffect(() => {
    if (lastVote && lastVote.type === 'SingleVote') {
      reset(lastVote);
    }
    if (lastVote && lastVote.type === 'Abstain') {
      reset({ candidateId: undefined });
    }
  }, [lastVote]);

  return (
    <div className="flex gap-4 flex-wrap flex-col items-stretch justify-center w-full max-w-xl">
      <Controller
        name="candidateId"
        control={control}
        render={({ field: { value, onChange } }) => (
          <>
            {candidatesReordered.map(candidate => (
              <Button
                className={twMerge(
                  value === candidate.id ? 'btn-accent' : undefined,
                )}
                onClick={() => {
                  onChange(candidate.id);
                  onSubmit();
                }}
                key={candidate.id}
              >
                {candidate.name}
              </Button>
            ))}
          </>
        )}
      />
      <div className="flex gap-2 justify-center">
        <Button
          className={twMerge(lastVote?.type === 'Abstain' ? 'btn-accent' : 'btn-outline')}
          onClick={() => {
            castVote({ type: 'Abstain' });
          }}
        >
          Abstain
        </Button>
      </div>
    </div>
  );
}

function PreferentialQuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  const candidatesReordered = useMemo(() => randomizeArray(question.candidates), [question.questionId]);

  const { register, handleSubmit, reset, formState: { errors } } = useZodForm({
    schema: z.object({
      votes: z.array(z.object({
        candidateId: z.string(),
        rank: z.number(),
      })).superRefine((votes, ctx) => {
        // create errors on the index of duplicate candidateId
        votes.forEach((vote, index) => {
          // Check if candidateId is duplicated
          const duplicates = votes.filter((v, i) => v.candidateId === vote.candidateId && i !== index);
          if (duplicates.length > 0) {
            ctx.addIssue({
              code: 'custom',
              message: 'Duplicate candidate',
              path: [index, 'candidateId'],
            });
          }
        });

        return undefined;
      },
      ),
    }),
    defaultValues: lastVote?.type === 'PreferentialVote'
      ? lastVote
      : {
          votes: candidatesReordered.map((candidate, index) => ({
            candidateId: candidate.id,
            rank: index + 1,
          })),
        },
  });

  const onSubmit = handleSubmit(async ({ votes }) => {
    console.log({ votes });
    castVote({
      type: 'PreferentialVote',
      votes,
    });
  });

  useEffect(() => {
    if (lastVote && lastVote.type === 'PreferentialVote') {
      reset(lastVote);
    }
  }, [lastVote]);

  const candidateRankList = useMemo(() => Array.from({ length: question.candidates.length }, (_, i) => i + 1), [question.candidates.length]);

  return (
    <div className="flex gap-4 flex-wrap flex-col items-stretch justify-center w-full max-w-xl">
      {candidateRankList.map((rank, index) => {
        const error = errors.votes?.[index]?.candidateId;

        return (
          <div key={rank} className="flex w-full justify-start">
            <span className="btn text-xl">{`${rank}. `}</span>
            <label className="form-control w-full">
              <select
                className={twMerge('select grow', error ? 'select-error' : undefined)}
                {...register(`votes.${index}.candidateId`)}
              >
                {candidatesReordered.map(candidateOption => (
                  <option value={candidateOption.id} key={candidateOption.id}>
                    {question.candidates.find(c => c.id === candidateOption.id)?.name}
                  </option>
                ))}
              </select>
              {error?.message
                ? (
                    <div className="label">
                      <span className="label-text-alt">{error.message}</span>
                    </div>
                  )
                : null}
            </label>

          </div>
        );
      },
      )}
      <div className="flex gap-2 justify-center">
        <Button
          className={twMerge(lastVote?.type === 'Abstain' ? 'btn-accent' : 'btn-outline')}
          onClick={() => {
            castVote({ type: 'Abstain' });
          }}
        >
          Abstain
        </Button>
        <Button onClick={onSubmit} className={twMerge(lastVote?.type === 'PreferentialVote' ? 'btn-accent' : 'btn-outline')}>Submit</Button>
      </div>

    </div>
  );
}

function QuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <Question>{question.question}</Question>

      {question.details.type === 'SingleVote'
        ? (
            <SingleQuestionVoting data={data} />
          )
        : (
            <PreferentialQuestionVoting data={data} />
          )}

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
