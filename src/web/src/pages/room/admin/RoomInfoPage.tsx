import { QuestionState } from '@server/live-room/question-states';
import type { PublicStaticRoomData } from '@server/rooms';
import { AdminRouter } from 'components/adminRouter';
import { QRCodeRender } from 'components/QRCode';
import { AdminPageContainer, Heading } from 'components/styles';
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

  const joinLink: string | undefined = location.origin + routeBuilders.shortJoin({ shortId: props.room.shortId });
  const boardLink: string | undefined = location.origin + routeBuilders.shortView({ shortId: props.room.shortId });

  return (
    <AdminPageContainer className="gap-4">
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />
      <p>People admitted into the room: {roomVoters}</p>
      <Heading>Join voting Room</Heading>
      FIXME: Remove the QR code from here. This page should only show metadata, not join links.
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
    </AdminPageContainer>
  );
}
