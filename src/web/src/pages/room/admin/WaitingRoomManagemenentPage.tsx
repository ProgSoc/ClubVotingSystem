import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { BoardState } from '../../../../../server/src/live-room/question-states';
import { QuestionState } from '../../../../../server/src/live-room/question-states';
import type { AdmittedRoomUserWithDetails, WaitingRoomUserWithDetails } from '../../../../../server/src/live-room/user';
import type { PublicStaticRoomData } from '../../../../../server/src/rooms';
import { routeBuilders } from '../../../routes';
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

function useQuestionSetter(props: { roomId: string; adminKey: string }) {
  const [state, setState] = useState<BoardState | null>(null);

  const createQuestionMutation = trpc.useMutation(['admin.questions.createQuestion']);
  const closeQuestionMutation = trpc.useMutation(['admin.questions.closeQuestion']);

  const createQuestion = (question: string, candidates: string[], maxChoices: number) => {
    if (state?.state === QuestionState.Blank || state?.state === QuestionState.ShowingResults) {
      createQuestionMutation.mutate({
        adminKey: props.adminKey,
        roomId: props.roomId,
        question,
        candidates,
        maxChoices,
      });
    }
  };

  const closeQuestion = () => {
    if (state?.state === QuestionState.ShowingQuestion) {
      closeQuestionMutation.mutate({
        adminKey: props.adminKey,
        roomId: props.roomId,
        questionId: state.questionId,
      });
    }
  };

  trpc.useSubscription(['room.listenBoardEvents', { roomId: props.roomId }], {
    onNext: (data) => {
      setState(data);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  return { state, createQuestion, closeQuestion };
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

export function WaitingRoomManagementPage(props: { roomId: string; room: PublicStaticRoomData; adminKey: string }) {
  const { users, voters, admitUser, declineUser } = useUserWaitingRoom(props);
  const { state, createQuestion, closeQuestion } = useQuestionSetter(props);

  return (
    <div>
      <div>
        <p>
          Join link: <a href={routeBuilders.joinRoom({ roomId: props.roomId })}>join</a>
        </p>
        <p>
          Board link: <a href={routeBuilders.viewRoomBoard({ roomId: props.roomId })}>join</a>
        </p>
        <h1>Waiting Room</h1>
        {users.map((user) => (
          <div key={user.id}>
            <div>{user.details.studentEmail}</div>
            <div>{user.details.location}</div>
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
        <h1>Voters:</h1>
        {voters.map((user) => (
          <div key={user.id}>
            <div>{user.details.studentEmail}</div>
            <div>{user.details.location}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
