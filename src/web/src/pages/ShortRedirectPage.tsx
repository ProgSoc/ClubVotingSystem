import { useNavigate } from 'react-router-dom';

import { trpc } from '../utils/trpc';
import { cacheFetchedRoom } from '../utils/withRoomData';

interface ShortRedirectPageProps {
  makePath: (roomId: string) => string;
  shortId: string;
}

export function ShortRedirectPageInner(props: ShortRedirectPageProps) {
  const navigate = useNavigate();

  const roomQuery = trpc.useQuery(['room.getRoomByShortId', { shortId: props.shortId }]);

  if (roomQuery.data?.id) {
    cacheFetchedRoom(roomQuery.data);
    navigate(props.makePath(roomQuery.data.id));
  }

  return (
    <div>
      <h1>Redirecting...</h1>
      {roomQuery.data && !roomQuery.data.id && <p>Room not found</p>}
    </div>
  );
}

export function ShortRedirectPage(makePath: ShortRedirectPageProps['makePath']) {
  return (props: { shortId: string }) => <ShortRedirectPageInner {...props} makePath={makePath} />;
}
