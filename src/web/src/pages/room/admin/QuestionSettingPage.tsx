import type { ShowingQuestionState, ShowingResultsState } from 'server/src/live/states';
import { BoardState } from 'server/src/live/states';
import type { CreateQuestionParams, RoomPublicInfo } from 'server/src/room/types';
import type { GetStatesUnion } from 'server/src/state';
import { makeStates, state } from 'server/src/state';
import { AdminRouter } from 'components/adminRouter';
import { ResultsViewer } from 'components/ResultsViewer';
import { Button, Heading, PageContainer, Question } from 'components/styles';
import { Field, Form, Formik } from 'formik';
import React, { createRef, useState } from 'react';
import { trpc } from 'utils/trpc';
import type { TypeOf } from 'zod';
import { z } from 'zod';
import { toFormikValidationSchema } from 'zod-formik-adapter';

interface QuestionSettingData {
  previousResults?: ShowingResultsState;
  setQuestion(params: CreateQuestionParams): void;
}

interface QuestionAskingData {
  question: ShowingQuestionState;
  endQuestion(): void;
}

type QuestionSettingPageState = GetStatesUnion<typeof QuestionSettingPageState.enum>;
const QuestionSettingPageState = makeStates('qsps', {
  loading: state<{}>(),
  ended: state<{}>(),
  setQuestion: state<QuestionSettingData>(),
  askingQuestion: state<QuestionAskingData>(),
});

function useQuestionSetter(props: { roomId: string; adminKey: string }): QuestionSettingPageState {
  const [state, setState] = useState<BoardState | null>(null);

  const createQuestionMutation = trpc.admin.questions.createQuestion.useMutation();
  const closeQuestionMutation = trpc.admin.questions.closeQuestion.useMutation();

  trpc.room.listenBoardEvents.useSubscription(
    { roomId: props.roomId },
    {
      onData: (data) => {
        setState(data);
      },
      onError: (err) => {
        console.error(err);
      },
    }
  );

  if (!state) {
    return QuestionSettingPageState.loading({});
  }

  const createQuestion = (params: CreateQuestionParams) => {
    createQuestionMutation.mutate({
      adminKey: props.adminKey,
      roomId: props.roomId,
      question: params.question,
      candidates: params.candidates,
      details: params.details,
    });
  };

  return BoardState.match<QuestionSettingPageState>(state, {
    blank: (state) => {
      return QuestionSettingPageState.setQuestion({
        setQuestion: createQuestion,
      });
    },

    showingResults: (state) => {
      return QuestionSettingPageState.setQuestion({
        previousResults: state,
        setQuestion: createQuestion,
      });
    },

    showingQuestion: (state) => {
      const endQuestion = () => {
        closeQuestionMutation.mutate({
          adminKey: props.adminKey,
          roomId: props.roomId,
          questionId: state.questionId,
        });
      };

      return QuestionSettingPageState.askingQuestion({
        question: state,
        endQuestion,
      });
    },

    ended: () => {
      return QuestionSettingPageState.ended({});
    },
  });
}

export function QuestionSettingPage(props: { roomId: string; room: RoomPublicInfo; adminKey: string }) {
  const data = useQuestionSetter(props);
  return (
    <PageContainer>
      <AdminRouter adminKey={props.adminKey} roomId={props.roomId} />
      <QuestionSetter data={data} />
    </PageContainer>
  );
}

function QuestionSetter({ data }: { data: QuestionSettingPageState }) {
  return QuestionSettingPageState.match(data, {
    loading: () => <Heading>Loading...</Heading>,
    ended: () => <Heading>Ended</Heading>,
    setQuestion: (data) => <SetQuestion data={data} />,
    askingQuestion: (data) => <AskingQuestion data={data} />,
  });
}

const schema = z.object({
  question: z.string().min(2),
  candidates: z.array(z.object({ name: z.string().min(1) })).min(2),
});

type CandidateInnerData = {
  name: string;
  innerId: number;
  inputRef: React.RefObject<HTMLInputElement>;
  forceSelect: boolean;
};
interface FormValues extends TypeOf<typeof schema> {
  candidates: CandidateInnerData[];
}

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
            { innerId: getId(), name: '', inputRef: createRef(), forceSelect: true },
            { innerId: getId(), name: '', inputRef: createRef(), forceSelect: false },
          ],
        }}
        onSubmit={onSubmit}
        validationSchema={toFormikValidationSchema(schema)}
        validateOnMount={true}
      >
        {(form) => {
          const addCandidate = (forceSelect: boolean) => {
            const data: CandidateInnerData = { innerId: getId(), name: '', inputRef: createRef(), forceSelect };
            form.setFieldValue('candidates', [...form.values.candidates, data]);
          };

          return (
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
                      <input
                        className="input input-bordered w-full sm:w-96"
                        placeholder="Candidate"
                        name={`candidates.${index}.name`}
                        value={candidate.name}
                        onChange={form.handleChange}
                        ref={(el) => {
                          // Unfortunately any is necessary here, because current is set to readonly in react
                          (candidate.inputRef as any).current = el;

                          if (candidate.forceSelect) {
                            el?.focus();
                            candidate.forceSelect = false;
                          }
                        }}
                        // select next input on tab
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const nextInput = form.values.candidates[index + 1]?.inputRef.current;
                            if (nextInput) {
                              nextInput.focus();
                            } else {
                              addCandidate(true);
                            }
                          }
                        }}
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
                  <Button className="btn-info" disabled={submitting} type="button" onClick={() => addCandidate(true)}>
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
          );
        }}
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
