import { Field, Form, Formik } from 'formik';
import { useState } from 'react';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

import type { CreateQuestionParams } from '../../../../../server/src/live-room/question';
import type {
  BoardState,
  ResultsView,
  ShowingQuestionState,
} from '../../../../../server/src/live-room/question-states';
import { QuestionState } from '../../../../../server/src/live-room/question-states';
import type { PublicStaticRoomData } from '../../../../../server/src/rooms';
import { UnreachableError } from '../../../../../server/src/unreachableError';
import { AdminRouter } from '../../../components/adminRouter';
import { AdminPageContainer, Button } from '../../../components/styles';
import { trpc } from '../../../utils/trpc';

interface LoadingState {
  type: 'loading';
}

interface EndedState {
  type: 'ended';
}

interface QuestionSettingData {
  type: 'set-question';
  previousResults?: ResultsView;
  setQuestion(params: CreateQuestionParams): void;
}

interface QuestionAskingData {
  type: 'asking-question';
  question: ShowingQuestionState;
  endQuestion(): void;
}

type QuestionSettingPageState = QuestionSettingData | QuestionAskingData | LoadingState | EndedState;

function useQuestionSetter(props: { roomId: string; adminKey: string }): QuestionSettingPageState {
  const [state, setState] = useState<BoardState | null>(null);

  const createQuestionMutation = trpc.useMutation(['admin.questions.createQuestion']);
  const closeQuestionMutation = trpc.useMutation(['admin.questions.closeQuestion']);

  const createQuestion = (params: CreateQuestionParams) => {
    if (state?.state === QuestionState.Blank || state?.state === QuestionState.ShowingResults) {
      createQuestionMutation.mutate({
        adminKey: props.adminKey,
        roomId: props.roomId,
        question: params.question,
        candidates: params.candidates,
        details: params.details,
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

  if (!state) {
    return {
      type: 'loading',
    };
  }

  if (state.state === QuestionState.Blank || state.state === QuestionState.ShowingResults) {
    return {
      type: 'set-question',
      previousResults: state.state === QuestionState.ShowingResults ? state.results : undefined,
      setQuestion: createQuestion,
    };
  }

  if (state.state === QuestionState.ShowingQuestion) {
    return {
      type: 'asking-question',
      question: state,
      endQuestion: closeQuestion,
    };
  }

  return {
    type: 'ended',
  };
}

export function QuestionSettingPage(props: { roomId: string; room: PublicStaticRoomData; adminKey: string }) {
  const data = useQuestionSetter(props);
  return (
    <AdminPageContainer>
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />
      <QuestionSetter data={data} />
    </AdminPageContainer>
  );
}

function QuestionSetter({ data }: { data: QuestionSettingPageState }) {
  switch (data.type) {
    case 'loading':
      return <div>Loading...</div>;
    case 'ended':
      return <div>Ended</div>;
    case 'set-question':
      return <SetQuestion data={data} />;
    case 'asking-question':
      return <AskingQuestion data={data} />;
    default:
      throw new UnreachableError(data);
  }
}

const schema = z.object({
  question: z.string().min(2),
  candidates: z.array(z.object({ name: z.string().min(1), innerId: z.number() })).min(2),
});

type FormValues = TypeOf<typeof schema>;

let id = 0;
const getId = () => id++;

function SetQuestion({ data }: { data: QuestionSettingData }) {
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    await data.setQuestion({
      question: values.question,
      candidates: values.candidates.map((c) => c.name),
      details: {
        type: 'SingleVote',
      },
    });
  };

  return (
    <Formik<FormValues>
      initialValues={{
        question: '',
        candidates: [
          { innerId: getId(), name: '' },
          { innerId: getId(), name: '' },
        ],
      }}
      onSubmit={onSubmit}
      validationSchema={toFormikValidationSchema(schema)}
      isInitialValid={false}
      initialErrors={{
        question: 'Required',
      }}
    >
      {(form) => (
        <Form>
          <fieldset disabled={submitting} className="gap-4 w-full flex flex-col justify-center items-center">
            <Field
              className="input input-bordered w-full sm:w-96"
              placeholder="Question"
              name="question"
              value={form.values.question}
              onChange={form.handleChange}
            />

            <div className="gap-2 flex flex-col">
              {form.values.candidates.map((candidate, index) => (
                <div key={candidate.innerId} className="flex gap-2">
                  <Field
                    className="input input-bordered w-full sm:w-96"
                    placeholder="Candidate"
                    name={`candidates.${index}.name`}
                    value={candidate.name}
                    onChange={form.handleChange}
                  />
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      form.setFieldValue(
                        'candidates',
                        form.values.candidates.filter((c) => c.innerId !== candidate.innerId)
                      );
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                className="btn-info"
                disabled={submitting}
                type="button"
                onClick={() => {
                  form.setFieldValue('candidates', [...form.values.candidates, { innerId: getId(), name: '' }]);
                }}
              >
                Add candidate
              </Button>
            </div>

            <Button
              className="w-32 btn-primary"
              type="submit"
              disabled={submitting || Object.values(form.errors).length > 0}
              isLoading={submitting}
            >
              Create
            </Button>
          </fieldset>
        </Form>
      )}
    </Formik>
  );
}

function AskingQuestion({ data }: { data: QuestionAskingData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-2xl font-bold">{data.question.question}</div>
      <progress
        className="progress progress-primary"
        max={data.question.totalPeople}
        value={data.question.peopleVoted}
      />
      <div className="flex flex-col gap-2">
        {data.question.candidates.map((candidate) => (
          <div key={candidate.id} className="flex gap-2">
            <div className="flex-1">{candidate.name}</div>
          </div>
        ))}
      </div>
      <Button className="btn-primary" onClick={data.endQuestion}>
        End question
      </Button>
    </div>
  );
}
