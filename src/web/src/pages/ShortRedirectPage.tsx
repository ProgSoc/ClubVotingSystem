import { useNavigate } from 'react-router-dom';

import { trpc } from '../utils/trpc';

interface ShortRedirectPageProps {
  newRoot: string;
  shortId: string;
}

export function ShortRedirectPageInner(props: ShortRedirectPageProps) {
  const navigate = useNavigate();

  const roomQuery = trpc.useQuery(['room.getRoomByShortId', { shortId: props.shortId }]);

  if (roomQuery.data?.roomId) {
    navigate(`/${props.newRoot}/${roomQuery.data.roomId}`);
  }

  return (
    <div>
      <h1>Redirecting...</h1>
      {roomQuery.data && !roomQuery.data.roomId && <p>Room not found</p>}
    </div>
  );
}

export function ShortRedirectPage(newRoot: string) {
  return (props: { shortId: string }) => <ShortRedirectPageInner {...props} newRoot={newRoot} />;
}
