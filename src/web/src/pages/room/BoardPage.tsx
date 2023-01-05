import { BoardState } from '@server/live-room/live-states';
import type { PublicStaticRoomData } from '@server/rooms';
import { QRCodeRender } from 'components/QRCode';
import { ResultsViewer } from 'components/ResultsViewer';
import { CenteredPageContainer, Heading, Question } from 'components/styles';
import { useState } from 'react';
import { routeBuilders } from 'routes';
import { twMerge } from 'tailwind-merge';
import { trpc } from 'utils/trpc';

export function BoardPage(props: { roomId: string; room: PublicStaticRoomData }) {
  return (
    <CenteredPageContainer className="gap-4">
      <div className="lg:hidden text-error">This page is not mobile friendly lol</div>
      <Heading className="text-accent">{props.room.name}</Heading>
      <div className="w-full flex flex-row items-center">
        <div className="w-1/2 flex flex-row-reverse text-right pr-8">
          <JoinPanel room={props.room} />
        </div>
        <div className="w-1/2 flex flex-row text-left pl-8">
          <StatusPanel room={props.room} />
        </div>
      </div>
    </CenteredPageContainer>
  );
}

function JoinPanel(props: { room: PublicStaticRoomData; className?: string }) {
  const joinLink = location.origin + routeBuilders.shortJoin({ shortId: props.room.shortId });
  const boardLink = location.origin + routeBuilders.shortView({ shortId: props.room.shortId });
  return (
    <div className={twMerge('flex flex-col items-end gap-4 bg-base-300 p-8 rounded-2xl shadow-lg', props.className)}>
      <Heading>Join voting Room</Heading>
      <QRCodeRender content={joinLink} />
      {joinLink && (
        <p>
          <a target="_blank" rel="noreferrer" href={joinLink} className="text-3xl underline text-info font-mono">
            {joinLink}
          </a>
        </p>
      )}
      <div className="gap-2">
        <Heading className="text-2xl">View board</Heading>
        {joinLink && (
          <p>
            <a target="_blank" rel="noreferrer" href={boardLink} className="text-xl underline text-info font-mono">
              {boardLink}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function StatusPanel(props: { room: PublicStaticRoomData }) {
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
    blank: () => <Heading>Waiting for a question...</Heading>,

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
