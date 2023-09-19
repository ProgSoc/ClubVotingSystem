import { BoardState } from '@server/live/states';
import type { RoomPublicInfo } from '@server/room/types';
import { QRCodeRender } from 'components/QRCode';
import { ResultsViewer } from 'components/ResultsViewer';
import { CenteredPageContainer, Heading, Question } from 'components/styles';
import { useState } from 'react';
import { routeBuilders } from 'routes';
import { twMerge } from 'tailwind-merge';
import { trpc } from 'utils/trpc';

export function BoardPage(props: { roomId: string; room: RoomPublicInfo }) {
  return (
    <CenteredPageContainer>
      <Heading className="text-accent mb-8">{props.room.name}</Heading>
      <div className="flex flex-col lg:flex-row items-center gap-24">
        <JoinPanel room={props.room} />
        <StatusPanel room={props.room} />
      </div>
    </CenteredPageContainer>
  );
}

function JoinPanel(props: { room: RoomPublicInfo; className?: string }) {
  const joinLink = location.origin + routeBuilders.shortJoin({ shortId: props.room.shortId });
  const boardLink = location.origin + routeBuilders.shortView({ shortId: props.room.shortId });
  return (
    <div
      className={twMerge('flex flex-col items-center md:bg-base-300 shadow-lg px-8 py-10 md:p-10 pt-1 md:pt-5 rounded-2xl', props.className)}
    >
      <div
        className="flex flex-col gap-5 py-10 items-center"
      >
        <Heading
          className="text-3xl md:text-4xl pb-3"
        >Join voting room</Heading>
        <QRCodeRender content={joinLink} />
        {joinLink && (
          <p>
            <a target="_blank" rel="noreferrer" href={joinLink} className="text-sm md:text-xl underline text-info font-mono">
              {joinLink}
            </a>
          </p>
        )}
      </div>
      <div
        className="flex flex-col gap-2 items-center"
      >
        <Heading className="text-2xl md:text-3xl">View board</Heading>
        {joinLink && (
          <p>
            <a target="_blank" rel="noreferrer" href={boardLink} className="text-sm md:text-xl underline text-info font-mono">
              {boardLink}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function StatusPanel(props: { room: RoomPublicInfo }) {
  const [state, setState] = useState<BoardState | null>(null);

  trpc.room.listenBoardEvents.useSubscription(
    { roomId: props.room.id },
    {
      onData: (data) => {
        setState(data);
      },
      onError: (err) => {
        console.error(err);
      },
    }
  );

  if (!state) {
    return <Heading>Loading...</Heading>;
  }

  return BoardState.match(state, {
    blank: () => (
      <div
        className="flex flex-col"
      >
        <Heading>Waiting for a question...</Heading>

      </div>
    ),

    showingQuestion: (state) => (
      <div className="flex flex-col gap-4">
        <Question>{state.question}</Question>

        <div className="flex gap-8 flex-col items-start">
          <div className="flex flex-col gap-4">
            <div>
              <div>Votes remaining: {state.totalPeople - state.peopleVoted}</div>
              <progress className="progress progress-info w-48" max={state.totalPeople} value={state.peopleVoted} />
            </div>
          </div>
          <div>
            <div className="flex flex-col gap-2 items-start flex-wrap max-h-[360px]">
              {state.candidates.map((candidate) => (
                <div className="alert min-w-[10rem] w-full" key={candidate.id}>
                  {candidate.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),

    showingResults: (state) => (
      <div className="flex flex-col items-center gap-4">
        <Question>{state.question}</Question>
        <ResultsViewer results={state.results} />
      </div>
    ),

    ended: () => <Heading>Room closed</Heading>,
  });
}
