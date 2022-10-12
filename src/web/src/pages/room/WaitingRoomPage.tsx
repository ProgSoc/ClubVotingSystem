import { RoomUserResolvedState } from '@server/live-room/user';
import type { PublicStaticRoomData } from '@server/rooms';
import { Heading, PageContainer } from 'components/styles';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeBuilders } from 'routes';
import { trpc } from 'utils/trpc';

export function WaitingRoomPage(props: { room: PublicStaticRoomData; roomId: string; userId: string }) {
  const navigate = useNavigate();

  const [state, setState] = useState<RoomUserResolvedState | null>(null);

  const response = trpc.useQuery([
    'waitingRoom.waitResponse',
    {
      roomId: props.roomId,
      userId: props.userId,
    },
  ]);

  useEffect(() => {
    if (response.data) {
      setState(response.data);
      if (RoomUserResolvedState.is.admitted(response.data)) {
        navigate(
          routeBuilders.votingRoom({
            roomId: props.roomId,
            userId: props.userId,
            voterId: response.data.voterId,
          })
        );
      }
    }
  }, [response.data]);

  if (!state) {
    return (
      <PageContainer>
        <Heading>Waiting to be accepted...</Heading>
      </PageContainer>
    );
  }

  return RoomUserResolvedState.match(state, {
    declined: () => (
      <PageContainer>
        <Heading>Sorry, you were declined.</Heading>
      </PageContainer>
    ),
    admitted: () => (
      <PageContainer>
        <Heading>Admitted</Heading>
      </PageContainer>
    ),
    kicked: () => (
      <PageContainer>
        <Heading>Sorry, you were kicked.</Heading>
      </PageContainer>
    ),
  });
}
