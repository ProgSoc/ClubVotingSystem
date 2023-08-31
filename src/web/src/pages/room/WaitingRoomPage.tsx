import { RoomUserResolvedState } from 'server/src/live/user';
import type { RoomPublicInfo } from 'server/src/room/types';
import { CenteredPageContainer, Heading } from 'components/styles';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeBuilders } from 'routes';
import { trpc } from 'utils/trpc';

export function WaitingRoomPage(props: { room: RoomPublicInfo; roomId: string; userId: string }) {
  const navigate = useNavigate();

  const [state, setState] = useState<RoomUserResolvedState | null>(null);

  const response = trpc.waitingRoom.waitResponse.useQuery({
    roomId: props.roomId,
    userId: props.userId,
  });

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
      <CenteredPageContainer>
        <Heading>Waiting to be accepted...</Heading>
      </CenteredPageContainer>
    );
  }

  return RoomUserResolvedState.match(state, {
    declined: () => (
      <CenteredPageContainer>
        <Heading>Sorry, you were declined.</Heading>
      </CenteredPageContainer>
    ),
    admitted: () => (
      <CenteredPageContainer>
        <Heading>Admitted</Heading>
      </CenteredPageContainer>
    ),
    kicked: () => (
      <CenteredPageContainer>
        <Heading>Sorry, you were kicked.</Heading>
      </CenteredPageContainer>
    ),
  });
}
