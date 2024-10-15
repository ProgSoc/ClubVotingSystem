import type { ShowingResultsState } from '@server/live/states';
import type { RoomPublicInfo } from '@server/room/types';
import { ResultsViewer } from 'components/ResultsViewer';
import { Button, CenteredPageContainer, Heading, Question } from 'components/styles';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { routeBuilders } from 'routes';
import { Reorder } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

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

  const { control, handleSubmit, reset } = useZodForm({
    schema: z.object({
      votes: z.array(z.object({
        candidateId: z.string(),
        rank: z.number(),
      })),
    }),
    defaultValues: lastVote?.type === 'PreferentialVote'
      ? lastVote
      : {
          votes: question.candidates.map((candidate, index) => ({
            candidateId: candidate.id,
            rank: index + 1,
          })),
        },
  });

  const candidatesReordered = useMemo(() => randomizeArray(question.candidates), [question.questionId]);

  const onSubmit = handleSubmit(async (data) => {
    castVote({
      type: 'PreferentialVote',
      votes: data.votes,
    });
  });

  useEffect(() => {
    if (lastVote && lastVote.type === 'PreferentialVote') {
      reset(lastVote);
    }
  }, [lastVote]);

  // Create a line for each candidate with a select input

  return (
    <Controller
      control={control}
      name="votes"
      render={({ field: { onChange, value } }) => (
        <>
          {candidatesReordered.map(candidate => (
            <div className="flex" key={candidate.id}>
              <label htmlFor={candidate.id}>{candidate.name}</label>
              <select
                id={candidate.id}
                name={candidate.id}
                onChange={(e) => {
                  const rank = e.target.value;
                  console.log({ rank });
                  console.log({ value });
                  const newVotes = value.map((vote) => {
                    if (vote.candidateId === candidate.id) {
                      return { candidateId: candidate.id, rank: Number.parseInt(rank) };
                    }
                    else {
                      return vote;
                    }
                  });
                  onChange(newVotes);
                  onSubmit();
                }}
              >
                {candidatesReordered.map((_, index) => (
                  <option value={index + 1} key={`${candidate.id}-${index + 1}`}>{index + 1}</option>
                ))}
              </select>
            </div>
          ))}
        </>
      )}
    >

    </Controller>
  );
}

function QuestionVoting({ data }: { data: QuestionVotingData }) {
  const { question, lastVote, castVote } = data;

  return (
    <form className="flex flex-col items-center gap-6 w-full">
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
