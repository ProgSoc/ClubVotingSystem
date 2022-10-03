import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routeBuilders } from '../routes';
import { trpc } from '../utils/trpc';

export function CreateRoomPage() {
  // Make a form for entering page name and submitting it
  const [pageName, setPageName] = useState('');
  const navigate = useNavigate();

  const mutation = trpc.useMutation(['createRoom']);

  const onSubmit = async () => {
    const result = await mutation.mutateAsync({ name: pageName });
    navigate(routeBuilders.manageWaitingRoom({ roomId: result.id, adminKey: result.adminKey }));
  };

  const disabled = mutation.isLoading || mutation.isSuccess;

  return (
    <div>
      <h1>Create a new room</h1>
      <input disabled={disabled} type="text" value={pageName} onChange={(e) => setPageName(e.target.value)} />
      <button disabled={disabled} onClick={onSubmit}>
        Create
      </button>
    </div>
  );
}
