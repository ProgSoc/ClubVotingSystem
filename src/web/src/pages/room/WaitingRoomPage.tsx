import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { trpc } from '../../utils/trpc';

export function WaitingRoomPage(props: { roomId: string; userId: string }) {
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
    return <h1>Waiting...</h1>;
  } else {
    return (
      <div>
        <h1>Sorry, you were declined.</h1>
      </div>
    );
  }
}
