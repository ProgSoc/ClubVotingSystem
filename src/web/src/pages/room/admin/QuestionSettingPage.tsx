import { Field, Form, Formik } from 'formik';
import { useState } from 'react';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

import type { CreateQuestionParams } from '../../../../../server/src/live-room/question';
import type {
  BoardState,
  ShowingQuestionState,
  ShowingResultsState,
} from '../../../../../server/src/live-room/question-states';
import { QuestionState } from '../../../../../server/src/live-room/question-states';
import type { PublicStaticRoomData } from '../../../../../server/src/rooms';
import { UnreachableError } from '../../../../../server/src/unreachableError';
import { AdminRouter } from '../../../components/adminRouter';
import { ResultsViewer } from '../../../components/ResultsViewer';
import { AdminPageContainer, Button, Heading, Question } from '../../../components/styles';
import { trpc } from '../../../utils/trpc';

interface LoadingState {
  type: 'loading';
}

interface EndedState {
  type: 'ended';
}

interface QuestionSettingData {
  type: 'set-question';
  previousResults?: ShowingResultsState;
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
    const createQuestion = (params: CreateQuestionParams) => {
      createQuestionMutation.mutate({
        adminKey: props.adminKey,
        roomId: props.roomId,
        question: params.question,
        candidates: params.candidates,
        details: params.details,
      });
    };

    return {
      type: 'set-question',
      previousResults: state.state === QuestionState.ShowingResults ? state : undefined,
      setQuestion: createQuestion,
    };
  }

  if (state.state === QuestionState.ShowingQuestion) {
    const closeQuestion = () => {
      closeQuestionMutation.mutate({
        adminKey: props.adminKey,
        roomId: props.roomId,
        questionId: state.questionId,
      });
    };

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
  // FIXME: Prettify the loading and ended states
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
    <>
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
        validateOnMount={true}
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
      {data.previousResults && (
        <div className="mt-8 flex flex-col items-center">
          <Heading className="mb-2">Previous results</Heading>
          <Question>{data.previousResults.question}</Question>
          <div className="mt-2">
            <ResultsViewer results={data.previousResults.results} />
          </div>
        </div>
      )}
    </>
  );
}

function AskingQuestion({ data }: { data: QuestionAskingData }) {
  return (
    <div className="flex flex-col gap-4">
      <Question>{data.question.question}</Question>

      <div className="flex gap-8 flex-col sm:flex-row">
        <div className="flex flex-col gap-4">
          <div>
            <div>Votes remaining: {data.question.totalPeople - data.question.peopleVoted}</div>
            <progress
              className="progress progress-info w-48"
              max={data.question.totalPeople}
              value={data.question.peopleVoted}
            />
          </div>
          <Button className="btn-primary" onClick={data.endQuestion}>
            End question
          </Button>
        </div>
        <div>
          <div className="flex flex-col gap-2">
            {data.question.candidates.map((candidate) => (
              <div className="alert min-w-[10rem] w-full" key={candidate.id}>
                {candidate.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
