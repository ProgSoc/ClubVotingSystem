import { Button, Heading, Input, Stack } from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { RoomContainer } from '../components/styles';
import { routeBuilders } from '../routes';
import { trpc } from '../utils/trpc';
import { cacheFetchedRoom } from '../utils/withRoomData';

export function CreateRoomPage() {
  // Make a form for entering page name and submitting it
  const [pageName, setPageName] = useState('');
  const navigate = useNavigate();

  const mutation = trpc.useMutation(['room.create']);

  const onSubmit = async () => {
    const result = await mutation.mutateAsync({ name: pageName.trim() });
    cacheFetchedRoom(result);
    navigate(routeBuilders.manageWaitingRoom({ roomId: result.id, adminKey: result.adminKey }));
  };

  const invalid = pageName.trim().length === 0;
  const disabled = mutation.isLoading || mutation.isSuccess;

  return (
    <RoomContainer>
      <Stack direction="column" spacing={4} align="center">
        <Heading>Create a new room</Heading>
        <fieldset disabled={disabled}>
          <Stack
            direction="column"
            spacing={2}
            align="center"
            css={{
              width: '100vw',
            }}
          >
            <Input
              type="text"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              css={{
                width: '500px',
                maxWidth: 'calc(100vw - 32px)',
              }}
            />
            <Button
              disabled={invalid || disabled}
              onClick={onSubmit}
              isLoading={mutation.isLoading}
              loadingText="Creating"
              colorScheme="blue"
            >
              Create
            </Button>
          </Stack>
        </fieldset>
      </Stack>
    </RoomContainer>
  );
}
