import { UserLocation } from '@prisma/client';
import { Button, Heading, PageContainer } from 'components/styles';
import { Field, Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import { routeBuilders } from 'routes';
import { trpc } from 'utils/trpc';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

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
    <PageContainer className="gap-4">
      <Heading>Join voting room</Heading>
      <fieldset className="w-full" disabled={disabled}>
        <Formik<FormValues>
          initialValues={{
            studentEmail: '',
            location: undefined as any,
          }}
          onSubmit={onSubmit}
          validationSchema={toFormikValidationSchema(schema)}
          validateOnMount={true}
        >
          {(form) => (
            <Form>
              <div className="gap-4 w-full flex flex-col justify-center items-center">
                <Field
                  className="input input-bordered w-full sm:w-96"
                  placeholder="Student Email (firstname.lastname)"
                  type="email"
                  name="studentEmail"
                  value={form.values.studentEmail}
                  onChange={form.handleChange}
                />
                <div className="flex items-center justify-center gap-4">
                  <label className="flex items-center gap-2">
                    <Field type="radio" name="location" value={UserLocation.InPerson} className="radio radio-primary" />
                    <span className="label-text">In Person</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Field type="radio" name="location" value={UserLocation.Online} className="radio radio-primary" />
                    Online
                  </label>
                </div>
                <Button
                  className="btn-primary w-32"
                  type="submit"
                  disabled={disabled || Object.values(form.errors).length > 0}
                  isLoading={mutation.isLoading}
                >
                  Join
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </fieldset>
    </PageContainer>
  );
}
