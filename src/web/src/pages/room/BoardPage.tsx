import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { BoardState } from '../../../../server/src/live-room/question-states';
import { QuestionState } from '../../../../server/src/live-room/question-states';
import { trpc } from '../../utils/trpc';

export function BoardPage(props: { roomId: string }) {
  const [state, setState] = useState<BoardState | null>(null);
  const navigate = useNavigate();

  trpc.useSubscription(['room.listenBoardEvents', { roomId: props.roomId }], {
    onNext: (data) => {
      setState(data);
    },
    onError: (err) => {
      console.error(err);
    },
  });

  if (!state) {
    return <h1>Loading...</h1>;
  }

  if (state.state === QuestionState.Blank) {
    return <h1>Waiting for a question...</h1>;
  }

  if (state.state === QuestionState.ShowingQuestion) {
    return (
      <div>
        <h1>Question: {state.question}</h1>
        <div>Candidates: {state.candidates.map((c) => c.name).join(', ')}</div>
        <div>Max Choices: {state.maxChoices}</div>
        <div>
          People voted: {state.peopleVoted}/{state.totalPeople}
        </div>
      </div>
    );
  }

  if (state.state === QuestionState.ShowingResults) {
    return (
      <div>
        <h1>Voting finished: {state.question}</h1>
        <div>
          Candidates:{' '}
          {state.candidates
            .sort((a, b) => a.votes - b.votes)
            .map((c) => `${c.name} (${c.votes})`)
            .join(', ')}
        </div>
        <div>Max Choices: {state.maxChoices}</div>
        <div>
          People voted: {state.peopleVoted}/{state.totalPeople}
        </div>
      </div>
    );
  }

  return <h1>Room closed</h1>;
}
