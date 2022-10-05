import { Heading } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { PublicStaticRoomData } from '../../../../server/src/rooms';
import { RoomContainer } from '../../components/styles';
import { trpc } from '../../utils/trpc';

export function WaitingRoomPage(props: { room: PublicStaticRoomData; roomId: string; userId: string }) {
  const navigate = useNavigate();

  const [declined, setDeclined] = useState(false);

  const response = trpc.useQuery([
    'waitingRoom.waitResponse',
    {
      roomId: props.roomId,
      userId: props.userId,
    },
  ]);

  useEffect(() => {
    if (response.data) {
      if (response.data.state === 'Admitted') {
        navigate(`/room/${props.roomId}/vote/${response.data.voterId}`);
      } else {
        setDeclined(true);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response.data]);

  if (!declined) {
    return (
      <RoomContainer>
        <Heading>Waiting to be accepted...</Heading>
      </RoomContainer>
    );
  } else {
    return (
      <RoomContainer>
        <Heading>Sorry, you were declined.</Heading>
      </RoomContainer>
    );
  }
}
