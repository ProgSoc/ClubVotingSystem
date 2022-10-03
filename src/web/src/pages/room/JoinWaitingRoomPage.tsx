import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { routeBuilders } from '../../routes';
import { trpc } from '../../utils/trpc';

interface FormValues {
  studentEmail: string;
  online: boolean;
}

const schema = z.object({
  studentEmail: z.string().email(),
  online: z.boolean(),
});

export function JoinWaitingRoomPage(props: { roomId: string }) {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      online: false,
      studentEmail: '',
    },
    resolver: zodResolver(schema),
  });

  const mutation = trpc.useMutation(['room.joinWaitingList']);

  const disabled = mutation.isLoading || mutation.isSuccess;

  const onSubmit = async (data: FormValues) => {
    if (disabled) {
      return;
    }
    const result = await mutation.mutateAsync({
      roomId: props.roomId,
      location: data.online ? 'Online' : 'InPerson',
      studentEmail: data.studentEmail,
    });

    navigate(routeBuilders.waitInWaitingRoom({ roomId: props.roomId, userId: result.id }));
  };

  return (
    <div>
      <fieldset disabled={disabled}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div>Email</div>
          <input {...register('studentEmail')} />
          <div>Online</div>
          <input type="checkbox" {...register('online')} />
          <button type="submit">Join</button>
        </form>
      </fieldset>
    </div>
  );
}
