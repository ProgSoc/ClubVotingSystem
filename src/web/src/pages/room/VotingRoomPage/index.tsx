import type { ShowingResultsState } from '@server/live/states';
import type { RoomPublicInfo } from '@server/room/types';
import { ResultsViewer } from 'components/ResultsViewer';
import { Button, CenteredPageContainer, Heading, Question } from 'components/styles';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeBuilders } from 'routes';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

import type { FieldError } from 'react-hook-form';
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
  );
}

function PreferentialQuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  const candidatesReordered = useMemo(() => randomizeArray(question.candidates), [question.questionId]);

  const { control, handleSubmit, reset } = useZodForm({
    schema: z.object({
      votes: z.array(z.object({
        candidateId: z.string(),
        rank: z.number(),
      })).superRefine((votes, ctx) => {
        // For every vote check if there is a vote with the same rank and throw an error for each index
        for (let i = 0; i < votes.length; i++) {
          if (votes.filter(vote => vote.rank === votes[i].rank).length > 1) {
            ctx.addIssue({
              message: 'All ranks must be unique',
              path: [i.toString(), 'rank'],
              code: 'custom',
            });
          }
        }

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

  return (
    <div className="flex flex-col gap-4 justify-center items-center">
      <Controller
        control={control}
        name="votes"
        render={({ field: { onChange, value }, fieldState: { error } }) => {
          const errorArray = error as unknown as { rank: FieldError }[];

          return (
            <div className="flex flex-col gap-4">
              {value.sort(
                (a, b) => a.rank > b.rank ? 1 : -1,
              ).map((candidate, index) => (
                <div key={candidate.candidateId} className="join flex w-full">
                  <span className="btn join-item ">{`${index + 1}. `}</span>
                  <select
                    className={twMerge('select select-bordered join-item grow', errorArray?.[index]?.rank ? 'select-error' : undefined)}
                    value={candidate.candidateId}
                    id={candidate.candidateId}
                    name={candidate.candidateId}
                    onChange={(e) => {
                      // Find the candidate with the id and update the rank
                      const newVotes = value.map((vote) => {
                        if (index === vote.rank - 1) {
                          return {
                            rank: index + 1,
                            candidateId: e.target.value,
                          };
                        }
                        return vote;
                      });
                      onChange(newVotes);
                    }}
                  >
                    {candidatesReordered.map(candidateOption => (
                      <option value={candidateOption.id} key={candidateOption.id}>
                        {/* Candidate name */}
                        {question.candidates.find(c => c.id === candidateOption.id)?.name}
                      </option>
                    ))}
                  </select>

                </div>
              ))}
            </div>
          );
        }}
      />
      <Button onClick={onSubmit} className={twMerge(lastVote?.type === 'PreferentialVote' ? 'btn-accent' : 'btn-outline')}>Submit</Button>
    </div>
  );
}

function QuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <Question>{question.question}</Question>
      <div className="flex gap-4 flex-wrap flex-col items-stretch justify-center w-full">
        {question.details.type === 'SingleVote'
          ? (
              <SingleQuestionVoting data={data} />
            )
          : (
              <PreferentialQuestionVoting data={data} />
            )}
        <div className="flex justify-center">
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
