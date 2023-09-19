import { UserLocation } from '@prisma/client';
import { Button, CenteredPageContainer, Heading } from 'components/styles';
import { Field, Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { routeBuilders } from 'routes';
import { locationEnumLabel } from 'utils/enumLabels';
import { trpc } from 'utils/trpc';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

const schema = z.object({
  email: z.string().email(),
  location: z.nativeEnum(UserLocation),
});

type FormValues = TypeOf<typeof schema>;

export function JoinWaitingRoomPage(props: { roomId: string }) {
  const navigate = useNavigate();

  const mutation = trpc.room.joinWaitingList.useMutation();

  const disabled = mutation.isLoading || mutation.isSuccess;

  const onSubmit = async (data: FormValues) => {
    if (disabled) {
      return;
    }
    const result = await mutation.mutateAsync({
      roomId: props.roomId,
      location: data.location,
      email: data.email,
    });

    navigate(routeBuilders.waitInWaitingRoom({ roomId: props.roomId, userId: result.userId }));
  };

  console.log(UserLocation);

  return (
    <CenteredPageContainer className="gap-4">
      <Heading>Join voting room</Heading>
      <fieldset className="w-full" disabled={disabled}>
        <Formik<FormValues>
          initialValues={{
            email: '',
            location: undefined as any,
          }}
          onSubmit={onSubmit}
          validationSchema={toFormikValidationSchema(schema)}
          validateOnMount={true}
        >
          {(form) => (
            <Form>
              <div className="gap-4 w-full flex flex-col justify-center items-center">
                <div className="flex flex-col gap-4">
                  <Field
                    className="input input-bordered w-full sm:w-96 text-sm md:text-base"
                    placeholder="Student Email (firstname.lastname)"
                    type="email"
                    name="email"
                    value={form.values.email}
                    onChange={form.handleChange}
                  />
                  <div className="flex items-start justify-center gap-4">
                    <label className="flex items-center gap-2">
                      <Field
                        type="radio"
                        name="location"
                        value={UserLocation.InPerson}
                        className="radio radio-primary"
                      />
                      <span className="label-text text-xs md:text-sm">{locationEnumLabel[UserLocation.InPerson]}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Field type="radio" name="location" value={UserLocation.Online} className="radio radio-primary" />
                      <span className="label-text text-xs md:text-sm">{locationEnumLabel[UserLocation.Online]}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Field type="radio" name="location" value={UserLocation.Proxy} className="radio radio-primary" />
                      <span className="label-text text-xs md:text-sm">{locationEnumLabel[UserLocation.Proxy]}</span>
                    </label>
                  </div>
                  <Button
                    className="btn-primary w-28 self-center m-3"
                    type="submit"
                    disabled={disabled || Object.values(form.errors).length > 0}
                    isLoading={mutation.isLoading}
                  >
                    Join
                  </Button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </fieldset>
    </CenteredPageContainer>
  );
}
