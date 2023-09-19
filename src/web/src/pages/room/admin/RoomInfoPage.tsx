import { BoardState } from '@server/live/states';
import type { RoomPublicInfo } from '@server/room/types';
import { AdminRouter } from 'components/adminRouter';
import { Button, Heading, PageContainer } from 'components/styles';
import { useState } from 'react';
import { routeBuilders } from 'routes';
import { trpc } from 'utils/trpc';

export function RoomInfoPage(props: { roomId: string; room: RoomPublicInfo; adminKey: string }) {
  const [roomVoters, setRoomVoters] = useState(0);

  trpc.room.listenBoardEvents.useSubscription(
    { roomId: props.roomId },
    {
      onData: (data) => {
        BoardState.match(data, {
          blank: (data) => setRoomVoters(data.totalPeople),
          showingQuestion: (data) => setRoomVoters(data.totalPeople),
          showingResults: (data) => setRoomVoters(data.totalPeople),
          ended: (data) => setRoomVoters(0),
        });
      },
    }
  );

  const boardLink = location.origin + routeBuilders.shortView({ shortId: props.room.shortId });

  return (
    <PageContainer className="gap-4">
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />
      <p>People admitted into the room: {roomVoters}</p>

      <div className="flex flex-col items-center gap-4">
        <div>
          <Heading className="text-2xl md:text-3xl m-3">View board</Heading>
          <a
            target="_blank"
            rel="noreferrer"
            href={boardLink}
            className="text-sm md:text-xl underline text-info font-mono"
          >
            {boardLink}
          </a>
        </div>
        <a target="_blank" rel="noreferrer" href={routeBuilders.viewRoomResults({ roomId: props.room.id })}>
          <Button className="btn btn-accent m-3">View Results</Button>
        </a>
      </div>
    </PageContainer>
  );
}
