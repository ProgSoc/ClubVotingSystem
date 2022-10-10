import { QuestionState } from '@server/live-room/question-states';
import type { PublicStaticRoomData } from '@server/rooms';
import { AdminRouter } from 'components/adminRouter';
import { AdminPageContainer, Button, Heading } from 'components/styles';
import { useState } from 'react';
import { routeBuilders } from 'routes';
import { trpc } from 'utils/trpc';

export function RoomInfoPage(props: { roomId: string; room: PublicStaticRoomData; adminKey: string }) {
  const [roomVoters, setRoomVoters] = useState(0);

  trpc.useSubscription(['room.listenBoardEvents', { roomId: props.roomId }], {
    onNext: (data) => {
      switch (data.state) {
        case QuestionState.Blank:
          setRoomVoters(data.totalPeople);
          break;
        case QuestionState.ShowingQuestion:
          setRoomVoters(data.totalPeople);
          break;
        case QuestionState.ShowingResults:
          setRoomVoters(data.totalPeople);
          break;
        case QuestionState.Ended:
          setRoomVoters(0);
          break;
      }
    },
  });

  const boardLink = location.origin + routeBuilders.shortView({ shortId: props.room.shortId });

  return (
    <AdminPageContainer className="gap-4">
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />
      <p>People admitted into the room: {roomVoters}</p>

      <div className="flex flex-col items-center gap-4">
        <div>
          <Heading>View board</Heading>
          <a target="_blank" rel="noreferrer" href={boardLink} className="text-2xl underline text-info font-mono">
            {boardLink}
          </a>
        </div>
        <a target="_blank" rel="noreferrer" href={routeBuilders.viewRoomResults({ roomId: props.room.id })}>
          <Button>View Results</Button>
        </a>
      </div>
    </AdminPageContainer>
  );
}
