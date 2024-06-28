import type { RoomPublicInfo } from '@server/room/types';
import { CenteredPageContainer, Heading } from 'components/styles';

import { trpc } from './trpc';

const cachedRooms: Record<string, RoomPublicInfo | undefined> = {};

export function withRoomFetched<Props extends { room: RoomPublicInfo }>(Component: React.ComponentType<Props>) {
  return function RoomFetched(props: { roomId: string } & Omit<Props, 'room'>) {
    const roomQuery = trpc.room.getRoomById.useQuery(
      { id: props.roomId },
      {
        enabled: !cachedRooms[props.roomId],
      },
    );

    if (roomQuery.data) {
      cachedRooms[props.roomId] = roomQuery.data;
    }

    const room = cachedRooms[props.roomId];
    if (!room) {
      return (
        <CenteredPageContainer>
          <Heading>Loading room...</Heading>
        </CenteredPageContainer>
      );
    }
    else {
      return <Component room={room} {...(props as any)} />;
    }
  };
}

export function cacheFetchedRoom(room: RoomPublicInfo) {
  cachedRooms[room.id] = room;
}
