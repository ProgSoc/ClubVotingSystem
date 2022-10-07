import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

import type { AdmittedRoomUserWithDetails, WaitingRoomUserWithDetails } from '../../../../../server/src/live-room/user';
import type { PublicStaticRoomData } from '../../../../../server/src/rooms';
import { AdminRouter } from '../../../components/adminRouter';
import { AdminPageContainer, Button, Heading } from '../../../components/styles';
import { trpc } from '../../../utils/trpc';

// Waiting = waiting for an admin to do something
enum UserState {
  Waiting = 'Waiting',
  Admitting = 'Admitting',
  Declining = 'Declining',
}
interface UserWithState extends WaitingRoomUserWithDetails {
  uiLoadingState: UserState;
}

function useUserWaitingRoom(props: { roomId: string; adminKey: string }) {
  const [users, setUsers] = useState<UserWithState[]>([]);
  const [voters, setVoters] = useState<AdmittedRoomUserWithDetails[]>([]);

  const navigate = useNavigate();

  const admitUserMutation = trpc.useMutation(['admin.users.admitUser']);
  const declineUserMutation = trpc.useMutation(['admin.users.declineUser']);

  const setUserState = (userId: string, uiLoadingState: UserState) => {
    setUsers((users) => {
      const user = users.find((u) => u.id === userId);
      if (!user) {
        return users;
      }
      return users.map((u) => (u.id === userId ? { ...u, uiLoadingState } : u));
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

  trpc.useSubscription(['admin.users.listenWaitingRoom', { roomId: props.roomId, adminKey: props.adminKey }], {
    onNext: (data) => {
      const { waiting, admitted } = data;

      setUsers((users) => {
        const getUserById = (userId: string) => users.find((u) => u.id === userId);

        return waiting.map((user) => ({
          ...user,

          // If the user already exist then keep the loading state, otherwise set it to waiting
          uiLoadingState: getUserById(user.id)?.uiLoadingState ?? UserState.Waiting,
        }));
      });

      setVoters(admitted);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  return { users, voters, admitUser, declineUser };
}

interface CreateQuestionData {
  question: string;
  candidates: string[];
  maxChoices: number;
}

let id = 0;
const makeId = () => id++;

const makeEmptyCandidate = () => ({ id: makeId(), value: '' });

function QuestionBuilder(props: { onSubmit: (data: CreateQuestionData) => void }) {
  const [question, setQuestion] = useState('');
  const [candidates, setCandidates] = useState([makeEmptyCandidate(), makeEmptyCandidate()]);
  const [maxChoices, setMaxChoices] = useState(1);

  const addCandidate = () => {
    setCandidates((candidates) => [...candidates, makeEmptyCandidate()]);
  };

  const removeCandidate = (index: number) => {
    setCandidates((candidates) => {
      const newCandidates = [...candidates];
      newCandidates.splice(index, 1);
      return newCandidates;
    });
  };

  const submit = () => {
    props.onSubmit({ question, maxChoices, candidates: candidates.map((c) => c.value) });
  };

  return (
    <div>
      <h1>Make question</h1>
      <div>
        <label>Question</label>
        <input id="question" type="text" value={question} onChange={(e) => setQuestion(e.target.value)} />
      </div>
      <div>
        <label>Candidates</label>
        {candidates.map((candidate, index) => (
          <div key={candidate.id}>
            <input
              type="text"
              value={candidate.value}
              onChange={(e) => {
                setCandidates((candidates) => {
                  const newCandidates = [...candidates];
                  newCandidates[index] = { ...newCandidates[index], value: e.target.value };
                  return newCandidates;
                });
              }}
            />
            <button onClick={() => removeCandidate(index)}>Remove</button>
          </div>
        ))}
        <button onClick={addCandidate}>Add candidate</button>
      </div>
      <div>
        <label>Max choices</label>
        <input type="number" value={maxChoices} onChange={(e) => setMaxChoices(Number(e.target.value))} />
      </div>
      <button onClick={submit}>Submit</button>
    </div>
  );
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
  const { users, voters, admitUser, declineUser } = useUserWaitingRoom(props);

  return (
    <AdminPageContainer>
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />

      <div className="flex flex-col items-center w-full gap-4">
        <Heading>Waiting Room</Heading>
        <div className="gap-2 flex flex-col">
          TODO: Add confirmation popup
          {users.map((user) => (
            <div key={user.id} className="navbar bg-base-300 rounded-lg text-lg gap-4 w-[600px]">
              <Email email={user.details.studentEmail} className="ml-2 mr-auto flex-shrink" />
              <div className="">{user.details.location}</div>
              <div className="gap-4">
                <Button
                  onClick={async () => {
                    if (user.uiLoadingState === UserState.Waiting) {
                      admitUser(user.id);
                    }
                  }}
                  isLoading={user.uiLoadingState === UserState.Admitting}
                >
                  Admit
                </Button>
                <Button
                  className="btn-error"
                  onClick={async () => {
                    if (user.uiLoadingState === UserState.Waiting) {
                      declineUser(user.id);
                    }
                  }}
                  isLoading={user.uiLoadingState === UserState.Declining}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Heading>Voters</Heading>
        TODO: Allow kicking voters
        {voters.map((user) => (
          <div key={user.id} className="navbar bg-base-300 rounded-lg text-lg gap-4 w-[600px]">
            <div className="flex-1">
              <Email email={user.details.studentEmail} className="ml-2 mr-auto" />
              <div className="">{user.details.location}</div>
            </div>
            <div className="gap-4">
              <Button
                className="btn-error"
                disabled={true}
                onClick={async () => {
                  declineUser(user.id);
                }}
              >
                Kick
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AdminPageContainer>
  );
}
