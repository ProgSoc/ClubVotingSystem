import type { RoomUserWithDetails } from '@server/live-room/user';
import type { PublicStaticRoomData } from '@server/rooms';
import { AdminRouter } from 'components/adminRouter';
import { Button, Heading, PageContainer } from 'components/styles';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { locationEnumLabel } from 'utils/enumLabels';
import { trpc } from 'utils/trpc';

// Waiting = waiting for an admin to do something
enum WaitingUserState {
  Waiting = 'Waiting',
  Admitting = 'Admitting',
  Declining = 'Declining',
}

// Waiting = waiting for an admin to do something
enum VoterState {
  Voting = 'Voting',
  Kicking = 'Kicking',
}

interface UserWithState extends RoomUserWithDetails {
  uiLoadingState: WaitingUserState;
}

interface VoterWithState extends RoomUserWithDetails {
  uiLoadingState: VoterState;
}

function useUserWaitingRoom(props: { roomId: string; adminKey: string }) {
  const [users, setUsers] = useState<UserWithState[]>([]);
  const [voters, setVoters] = useState<VoterWithState[]>([]);

  const admitUserMutation = trpc.useMutation(['admin.users.admitUser']);
  const declineUserMutation = trpc.useMutation(['admin.users.declineUser']);
  const kickVoterMutation = trpc.useMutation(['admin.users.kickVoter']);

  const setUserState = (userId: string, uiLoadingState: WaitingUserState) => {
    setUsers((users) => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        return users;
      }
      return users.map((u) => (u.id === userId ? { ...u, uiLoadingState } : u));
    });
  };

  const setVoterState = (userId: string, uiLoadingState: VoterState) => {
    setVoters((voters) => {
      const user = voters.find((u) => u.id === userId);
      if (!user) {
        return voters;
      }
      return voters.map((u) => (u.id === userId ? { ...u, uiLoadingState } : u));
    });
  };

  const declineUser = (userId: string) => {
    declineUserMutation.mutate({ adminKey: props.adminKey, roomId: props.roomId, userId });
    setUserState(userId, WaitingUserState.Declining);
  };

  const admitUser = (userId: string) => {
    admitUserMutation.mutate({ adminKey: props.adminKey, roomId: props.roomId, userId });
    setUserState(userId, WaitingUserState.Admitting);
  };

  const kickVoter = (userId: string) => {
    kickVoterMutation.mutate({ adminKey: props.adminKey, roomId: props.roomId, userId });
    setVoterState(userId, VoterState.Kicking);
  };

  trpc.useSubscription(['admin.users.listenWaitingRoom', { roomId: props.roomId, adminKey: props.adminKey }], {
    onNext: (data) => {
      const { waiting, admitted } = data;

      setUsers((users) => {
        const getUserById = (userId: string) => users.find((u) => u.id === userId);

        return waiting.map((user) => ({
          ...user,

          // If the user already exist then keep the loading state, otherwise set it to waiting
          uiLoadingState: getUserById(user.id)?.uiLoadingState ?? WaitingUserState.Waiting,
        }));
      });

      setVoters((voters) => {
        const getUserById = (userId: string) => voters.find((u) => u.id === userId);

        return admitted.map((voters) => ({
          ...voters,

          // If the user already exist then keep the loading state, otherwise set it to voting
          uiLoadingState: getUserById(voters.id)?.uiLoadingState ?? VoterState.Voting,
        }));
      });
    },
    onError: (err) => {
      console.error(err);
    },
  });

  return { users, voters, admitUser, declineUser, kickVoter };
}

function Email(props: { email: string; className?: string }) {
  // split email into name and url
  const [name, url] = props.email.split('@');

  const className = twMerge('text-info overflow-hidden overflow-ellipsis whitespace-nowrap', props.className);

  if (!url) {
    return <span className={className}>{props.email}</span>;
  } else {
    return (
      <span className={className}>
        {name}
        <span className="opacity-20 overflow-hidden overflow-ellipsis whitespace-nowrap">@{url}</span>
      </span>
    );
  }
}

export function WaitingRoomManagementPage(props: { roomId: string; room: PublicStaticRoomData; adminKey: string }) {
  const { users, voters, admitUser, declineUser, kickVoter } = useUserWaitingRoom(props);

  return (
    <PageContainer>
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />

      <div className="flex flex-col items-center w-full gap-4">
        <Heading>Waiting Room</Heading>
        <div className="gap-2 flex flex-col">
          {users.map((user) => (
            <div key={user.id} className="navbar bg-base-300 rounded-lg text-lg gap-4 w-[600px]">
              <Email email={user.details.studentEmail} className="ml-2 mr-auto flex-shrink" />
              <div className="">{locationEnumLabel[user.details.location]}</div>
              <div className="gap-4">
                <Button
                  className="btn-primary"
                  onClick={async () => {
                    if (user.uiLoadingState === WaitingUserState.Waiting) {
                      admitUser(user.id);
                    }
                  }}
                  isLoading={user.uiLoadingState === WaitingUserState.Admitting}
                >
                  Admit
                </Button>
                <Button
                  className="btn-error"
                  onClick={async () => {
                    if (user.uiLoadingState === WaitingUserState.Waiting) {
                      declineUser(user.id);
                    }
                  }}
                  isLoading={user.uiLoadingState === WaitingUserState.Declining}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Heading>Voters</Heading>
        {voters.map((user) => (
          <div key={user.id} className="navbar bg-base-300 rounded-lg text-lg gap-4 w-[600px]">
            <div className="flex-1">
              <Email email={user.details.studentEmail} className="ml-2 mr-auto" />
              <div className="">{locationEnumLabel[user.details.location]}</div>
            </div>
            <div className="gap-4">
              <Button
                className="btn-error"
                onClick={async () => {
                  kickVoter(user.id);
                }}
              >
                Kick
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
