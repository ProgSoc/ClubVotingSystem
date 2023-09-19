import { Button, CenteredPageContainer, Heading } from 'components/styles';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { routeBuilders } from 'routes';
import { trpc } from 'utils/trpc';
import { cacheFetchedRoom } from 'utils/withRoomData';

export function CreateRoomPage() {
  // Make a form for entering page name and submitting it
  const [pageName, setPageName] = useState('');
  const navigate = useNavigate();

  const mutation = trpc.room.createNewRoom.useMutation();

  const onSubmit = async () => {
    const result = await mutation.mutateAsync({ name: pageName.trim() });
    cacheFetchedRoom(result);
    navigate(routeBuilders.manageRoomInfo({ roomId: result.id, adminKey: result.adminKey }));
  };

  const invalid = pageName.trim().length === 0;
  const disabled = mutation.isLoading || mutation.isSuccess;

  return (
    <CenteredPageContainer className="gap-4">
      <Heading>Create a new room</Heading>
        <fieldset disabled={disabled} className="gap-2 w-full flex flex-col justify-center items-center">
        <input
          className="input input-bordered w-full sm:w-96"
          type="text"
          value={pageName}
          onChange={(e) => setPageName(e.target.value)}
        />
        <Button
          className="btn btn-primary m-3"
          disabled={invalid || disabled}
          onClick={onSubmit}
          isLoading={mutation.isLoading}
        >
          Create
        </Button>
      </fieldset>
    </CenteredPageContainer>
  );
}
