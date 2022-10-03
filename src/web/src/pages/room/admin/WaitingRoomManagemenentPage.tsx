import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { WaitingRoomUserWithDetails } from '../../../../../server/src/live-room/user';
import { routeBuilders } from '../../../routes';
import { trpc } from '../../../utils/trpc';

// Waiting = waiting for an admin to do something
enum UserState {
  Waiting = 'Waiting',
  Admitting = 'Admitting',
  Declining = 'Declining',
}
type UserWithState = WaitingRoomUserWithDetails & { state: UserState };

export function WaitingRoomManagementPage(props: { roomId: string; adminKey: string }) {
  const [users, setUsers] = useState<UserWithState[]>([]);
  const navigate = useNavigate();

  console.log(location);

  const admitUserMutation = trpc.useMutation(['roomAdmin.admitUser']);
  const declineUserMutation = trpc.useMutation(['roomAdmin.declineUser']);

  const setUserState = (userId: string, state: UserState) => {
    setUsers((users) => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        return users;
      }
      return users.map((u) => (u.id === userId ? { ...u, state } : u));
    });
  };

  const declineUser = (userId: string) => {
    declineUserMutation.mutate({ adminKey: props.adminKey, roomId: props.roomId, userId });
    setUserState(userId, UserState.Declining);
  };

  const admitUser = (userId: string) => {
    admitUserMutation.mutate({ adminKey: props.adminKey, roomId: props.roomId, userId });
    setUserState(userId, UserState.Admitting);
  };

  trpc.useSubscription(['roomAdmin.listenWaitingRoom', { roomId: props.roomId, adminKey: props.adminKey }], {
    onNext: (data) => {
      console.log(data);
      setUsers((users) => {
        const getUserById = (userId: string) => users.find((u) => u.id === userId);

        return data.map((user) => ({
          ...user,
          // If the user already exist then keep the state, otherwise set it to waiting
          state: getUserById(user.id)?.state ?? UserState.Waiting,
        }));
      });
    },
    onError: (err) => {
      console.error(err);
      navigate('/');
    },
  });

  const joinLink = routeBuilders.joinRoom({ roomId: props.roomId });

  return (
    <div>
      <p>
        Join link: <a href={joinLink}>join</a>
      </p>
      <h1>Waiting Room</h1>
      {users.map((user) => (
        <div key={user.id}>
          <div>{user.studentEmail}</div>
          <div>{user.location}</div>
          <div>
            <button
              onClick={async () => {
                admitUser(user.id);
              }}
            >
              Admit
            </button>
            <button
              onClick={async () => {
                declineUser(user.id);
              }}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
