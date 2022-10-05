import { Button, Heading, Input, Radio, RadioGroup, Stack } from '@chakra-ui/react';
import { UserLocation } from '@prisma/client';
import { Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

import { RoomContainer } from '../../components/styles';
import { routeBuilders } from '../../routes';
import { trpc } from '../../utils/trpc';

const schema = z.object({
  studentEmail: z.string().email(),
  location: z.nativeEnum(UserLocation),
});

type FormValues = TypeOf<typeof schema>;

export function JoinWaitingRoomPage(props: { roomId: string }) {
  const navigate = useNavigate();

  const mutation = trpc.useMutation(['room.joinWaitingList']);

  const disabled = mutation.isLoading || mutation.isSuccess;

  const onSubmit = async (data: FormValues) => {
    if (disabled) {
      return;
    }
    const result = await mutation.mutateAsync({
      roomId: props.roomId,
      location: data.location,
      studentEmail: data.studentEmail,
    });

    navigate(routeBuilders.waitInWaitingRoom({ roomId: props.roomId, userId: result.id }));
  };

  return (
    <RoomContainer>
      <Stack direction="column" spacing={4} align="center">
        <Heading>Join voting room</Heading>
        <fieldset disabled={disabled}>
          <Formik<FormValues>
            initialValues={{
              studentEmail: '',
              location: undefined as any,
            }}
            onSubmit={onSubmit}
            validationSchema={toFormikValidationSchema(schema)}
            isInitialValid={false}
            initialErrors={{
              studentEmail: 'Required',
            }}
          >
            {(form) => (
              <Form>
                <Stack
                  direction="column"
                  spacing={2}
                  align="center"
                  css={{
                    width: '100vw',
                  }}
                >
                  <Input
                    placeholder="Student Email"
                    type="email"
                    name="studentEmail"
                    css={{
                      width: '400px',
                      maxWidth: 'calc(100vw - 32px)',
                    }}
                    value={form.values.studentEmail}
                    onChange={form.handleChange}
                  />
                  <RadioGroup
                    value={form.values.location}
                    onChange={(value) => {
                      form.setFieldValue('location', value as UserLocation);
                    }}
                  >
                    <Stack direction="row">
                      <Radio value={UserLocation.InPerson}>In Person</Radio>
                      <Radio value={UserLocation.Online}>Online</Radio>
                    </Stack>
                  </RadioGroup>
                  <Button
                    colorScheme="blue"
                    type="submit"
                    disabled={disabled || Object.values(form.errors).length > 0}
                    isLoading={mutation.isLoading}
                    loadingText="Joining"
                  >
                    Join
                  </Button>
                </Stack>
              </Form>
            )}
          </Formik>
        </fieldset>
      </Stack>
    </RoomContainer>
  );
}
