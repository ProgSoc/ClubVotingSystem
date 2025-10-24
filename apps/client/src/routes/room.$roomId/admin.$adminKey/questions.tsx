import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import { ResultsViewer } from "components/ResultsViewer";
import { Button, Heading, Question } from "components/styles";
import { Field, Form, Formik } from "formik";
import type React from "react";
import { createRef, useId, useState } from "react";
import type { QuestionFormat } from "server/src/dbschema/interfaces";
import type {
	ShowingQuestionState,
	ShowingResultsState,
} from "server/src/live/states";
import { BoardState } from "server/src/live/states";
import type { CreateQuestionParams } from "server/src/room/types";
import type { GetStatesUnion } from "server/src/state";
import { makeStates, state } from "server/src/state";
import { UnreachableError } from "server/src/unreachableError";
import { trpc } from "utils/trpc";
import type { TypeOf } from "zod";
import { z } from "zod";
import { toFormikValidationSchema } from "zod-formik-adapter";

export const Route = createFileRoute("/room/$roomId/admin/$adminKey/questions")(
	{
		component: RouteComponent,
	},
);

interface QuestionSettingData {
	previousResults?: ShowingResultsState;
	setQuestion: (params: CreateQuestionParams) => void;
}

interface QuestionAskingData {
	question: ShowingQuestionState;
	endQuestion: () => void;
}

type QuestionSettingPageState = GetStatesUnion<
	typeof QuestionSettingPageState.enum
>;
const QuestionSettingPageState = makeStates("qsps", {
	loading: state<{}>(),
	ended: state<{}>(),
	setQuestion: state<QuestionSettingData>(),
	askingQuestion: state<QuestionAskingData>(),
});

function useQuestionSetter(props: {
	roomId: string;
	adminKey: string;
}): QuestionSettingPageState {
	const createQuestionMutation = useMutation(
		trpc.admin.questions.createQuestion.mutationOptions(),
	);

	const closeQuestionMutation = useMutation(
		trpc.admin.questions.closeQuestion.mutationOptions(),
	);

	const { data: state } = useSubscription(
		trpc.room.listenBoardEvents.subscriptionOptions({ roomId: props.roomId }),
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
		blank: (_state) => {
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

function RouteComponent() {
	const { adminKey, roomId } = Route.useParams();

	const data = useQuestionSetter({
		adminKey,
		roomId,
	});

	return QuestionSettingPageState.match(data, {
		loading: () => <Heading>Loading...</Heading>,
		ended: () => <Heading>Ended</Heading>,
		setQuestion: (data) => <SetQuestion data={data} />,
		askingQuestion: (data) => <AskingQuestion data={data} />,
	});
}

const schema = z.object({
	question: z.string().min(2),
	questionType: z.union([
		z.literal("SingleVote" satisfies QuestionFormat),
		z.literal("PreferentialVote" satisfies QuestionFormat),
	]),
	maxElected: z.coerce.number().positive(),
	candidates: z.array(z.object({ name: z.string().min(1) })).min(2),
});

interface CandidateInnerData {
	name: string;
	innerId: number;
	inputRef: React.RefObject<HTMLInputElement>;
	forceSelect: boolean;
}
interface FormValues extends TypeOf<typeof schema> {
	candidates: CandidateInnerData[];
}

let id = 0;
const getId = () => id++;

function SetQuestion({ data }: { data: QuestionSettingData }) {
	const [submitting, setSubmitting] = useState(false);

	const questionTypeSelectId = useId();
	const questionTitleInputId = useId();
	const maxResultsInputId = useId();

	const onSubmit = async (values: FormValues) => {
		setSubmitting(true);

		switch (values.questionType) {
			case "SingleVote":
				await data.setQuestion({
					question: values.question,
					candidates: values.candidates.map((c) => c.name),
					details: {
						type: "SingleVote",
					},
				});
				break;
			case "PreferentialVote":
				await data.setQuestion({
					question: values.question,
					candidates: values.candidates.map((c) => c.name),
					details: {
						type: "PreferentialVote",
						maxElected: values.maxElected,
					},
				});
				break;
			default:
				throw new UnreachableError(values.questionType);
		}
	};

	return (
		<div className="flex flex-col lg:flex-row items-center gap-24">
			<Formik<FormValues>
				initialValues={{
					question: "",
					maxElected: 1,
					questionType: "SingleVote",
					candidates: [
						{
							innerId: getId(),
							name: "",
							inputRef: createRef(),
							forceSelect: true,
						},
						{
							innerId: getId(),
							name: "",
							inputRef: createRef(),
							forceSelect: false,
						},
					],
				}}
				onSubmit={onSubmit}
				validationSchema={toFormikValidationSchema(schema)}
				validateOnMount={true}
			>
				{(form) => {
					const addCandidate = (forceSelect: boolean) => {
						const data: CandidateInnerData = {
							innerId: getId(),
							name: "",
							inputRef: createRef(),
							forceSelect,
						};
						form.setFieldValue("candidates", [...form.values.candidates, data]);
					};

					return (
						<Form className="flex flex-col m-8 md:bg-base-300 shadow-lg md:p-10 md:pt-5 rounded-2xl">
							<fieldset
								disabled={submitting}
								className="gap-4 w-full flex flex-col justify-center items-center"
							>
								<label
									className="form-control  w-full   mt-8 mb-2"
									htmlFor={questionTitleInputId}
								>
									<div className="label">
										<span className="label-text">Question</span>
									</div>
									<Field
										className="input input-bordered input-primary text-center"
										placeholder="What pizza should we get?"
										name="question"
										value={form.values.question}
										onChange={form.handleChange}
										id={questionTitleInputId}
									/>
								</label>
								<div className="flex gap-2 w-full">
									<label
										className="form-control mb-8 grow"
										htmlFor={questionTypeSelectId}
									>
										<div className="label">
											<span className="label-text">Question Type</span>
										</div>
										<Field
											as="select"
											className="select select-bordered select-primary text-center "
											name="questionType"
											value={form.values.questionType}
											onChange={form.handleChange}
											id={questionTypeSelectId}
										>
											<option value="SingleVote">Single vote</option>
											<option value="PreferentialVote">
												Preferential vote
											</option>
										</Field>
									</label>
									<label
										className="form-control mb-8"
										htmlFor={maxResultsInputId}
									>
										<div className="label">
											<span className="label-text">Max Results</span>
										</div>
										<Field
											className="input input-bordered input-primary w-24 text-center disabled:opacity-50"
											placeholder="Max elected"
											name="maxElected"
											value={form.values.maxElected}
											onChange={form.handleChange}
											disabled={form.values.questionType === "SingleVote"}
											id={maxResultsInputId}
										/>
									</label>
								</div>

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
													// biome-ignore lint/suspicious/noExplicitAny: Unfortunately any is necessary here, because current is set to readonly in react
													(candidate.inputRef as any).current = el;

													if (candidate.forceSelect) {
														el?.focus();
														candidate.forceSelect = false;
													}
												}}
												// select next input on tab
												onKeyDown={(e) => {
													if (e.key === "Tab") {
														e.preventDefault();
														const nextInput =
															form.values.candidates[index + 1]?.inputRef
																.current;
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
														"candidates",
														form.values.candidates.filter(
															(c) => c.innerId !== candidate.innerId,
														),
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
										onClick={() => addCandidate(true)}
									>
										Add candidate
									</Button>
								</div>

								<Button
									className="w-32 btn-primary m-5"
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
				<div>
					<Heading>Previous results</Heading>
					<div className="mt-8 flex flex-col gap-8 items-center">
						<Question>{data.previousResults.question}</Question>
						<ResultsViewer results={data.previousResults.results} />
					</div>
				</div>
			)}
		</div>
	);
}

function AskingQuestion({ data }: { data: QuestionAskingData }) {
	return (
		<div className="flex flex-col gap-4">
			<Question>{data.question.question}</Question>

			<div className="flex gap-8 flex-col sm:flex-row">
				<div className="flex flex-col gap-4">
					<div>
						<div>
							Votes remaining:
							{data.question.totalPeople - data.question.peopleVoted}
						</div>
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
