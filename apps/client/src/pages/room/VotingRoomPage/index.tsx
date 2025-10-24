import { ResultsViewer } from "components/ResultsViewer";
import {
	Button,
	CenteredPageContainer,
	Heading,
	Question,
} from "components/styles";
import { routeBuilders } from "old_routes";
import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import type {
	ShowingResultsState,
	VotingCandidate,
} from "server/src/live/states";
import type { RoomPublicInfo } from "server/src/room/types";
import { twMerge } from "tailwind-merge";
import { makeRandomSeed, secureShuffle } from "utils/shuffleArray";
import { z } from "zod";
import useZodForm from "../../../hooks/useZodForm";
import type { QuestionVotingData } from "./hooks";
import { useVoterState, VotingPageState } from "./hooks";

export function VotingRoomPage(props: {
	roomId: string;
	userId: string;
	room: RoomPublicInfo;
	votingKey: string;
}) {
	const data = useVoterState(props);

	// Navigate to waiting room if the user was kicked
	const navigate = useNavigate();
	useEffect(() => {
		if (VotingPageState.is.kicked(data)) {
			navigate(
				routeBuilders.waitInWaitingRoom({
					roomId: props.roomId,
					userId: props.userId,
				}),
			);
		}
	}, [data, navigate, props.roomId, props.userId]);

	return (
		<CenteredPageContainer className="pt-32 sm:pt-4">
			<QuestionVoter data={data} />
		</CenteredPageContainer>
	);
}

function QuestionVoter({ data }: { data: VotingPageState }) {
	return VotingPageState.match(data, {
		loading: () => <Heading>Loading...</Heading>,
		waiting: () => <Heading>Waiting for question</Heading>,
		ended: () => <Heading>Ended</Heading>,
		voting: (data) => <QuestionVoting data={data} />,
		viewingResults: (data) => <ViewingResults data={data} />,
		kicked: () => <></>,
	});
}

function SingleQuestionVoting({ data }: { data: QuestionVotingData }) {
	const { question, lastVote, castVote } = data;

	const { control, handleSubmit, reset } = useZodForm({
		schema: z.object({
			candidateId: z.string(),
		}),
		defaultValues: lastVote?.type === "SingleVote" ? lastVote : undefined,
	});

	const randomSeed = useMemo(() => makeRandomSeed(), []);

	const [candidatesReordered, setCandidatesReordered] = useState<
		Array<VotingCandidate>
	>([]);

	useEffect(() => {
		secureShuffle(question.candidates, randomSeed).then((data) =>
			setCandidatesReordered(data),
		);
	}, [question.candidates, randomSeed]);

	const onSubmit = handleSubmit(async (data) => {
		castVote({
			type: "SingleVote",
			candidateId: data.candidateId,
		});
	});

	useEffect(() => {
		if (lastVote && lastVote.type === "SingleVote") {
			reset(lastVote);
		}
		if (lastVote && lastVote.type === "Abstain") {
			reset({ candidateId: undefined });
		}
	}, [lastVote, reset]);

	return (
		<div className="flex gap-4 flex-wrap flex-col items-stretch justify-center w-full max-w-xl">
			<Controller
				name="candidateId"
				control={control}
				render={({ field: { value, onChange } }) => (
					<>
						{candidatesReordered.map((candidate) => (
							<Button
								className={twMerge(
									value === candidate.id ? "btn-accent" : undefined,
								)}
								onClick={() => {
									onChange(candidate.id);
									onSubmit();
								}}
								key={candidate.id}
							>
								{candidate.name}
							</Button>
						))}
					</>
				)}
			/>
			<div className="flex gap-2 justify-center">
				<Button
					className={twMerge(
						lastVote?.type === "Abstain" ? "btn-accent" : "btn-outline",
					)}
					onClick={() => {
						castVote({ type: "Abstain" });
					}}
				>
					Abstain
				</Button>
			</div>
		</div>
	);
}

function PreferentialQuestionVoting({ data }: { data: QuestionVotingData }) {
	const { question, lastVote, castVote } = data;

	const randomSeed = useMemo(() => makeRandomSeed(), []);

	const [candidatesReordered, setCandidatesReordered] = useState<
		Array<VotingCandidate>
	>([]);

	useEffect(() => {
		secureShuffle(question.candidates, randomSeed).then((data) =>
			setCandidatesReordered(data),
		);
	}, [question.candidates, randomSeed]);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isDirty },
	} = useZodForm({
		schema: z.object({
			votes: z
				.array(
					z.object({
						candidateId: z.string(),
						rank: z.number(),
					}),
				)
				.superRefine((votes, ctx) => {
					// create errors on the index of duplicate candidateId
					votes.forEach((vote, index) => {
						// Check if candidateId is duplicated
						const duplicates = votes.filter(
							(v, i) => v.candidateId === vote.candidateId && i !== index,
						);
						if (duplicates.length > 0) {
							ctx.addIssue({
								code: "custom",
								message: "Duplicate candidate",
								path: [index, "candidateId"],
							});
						}
					});

					return undefined;
				}),
		}),
		defaultValues:
			lastVote?.type === "PreferentialVote"
				? lastVote
				: {
						votes: candidatesReordered.map((candidate, index) => ({
							candidateId: candidate.id,
							rank: index + 1,
						})),
					},
	});

	const onSubmit = handleSubmit(async ({ votes }) => {
		console.log({ votes });
		castVote({
			type: "PreferentialVote",
			votes,
		});
	});

	useEffect(() => {
		if (lastVote && lastVote.type === "PreferentialVote") {
			reset(lastVote);
		}
	}, [lastVote, reset]);

	const candidateRankList = useMemo(
		() => Array.from({ length: question.candidates.length }, (_, i) => i + 1),
		[question.candidates.length],
	);

	return (
		<div className="flex gap-4 flex-wrap flex-col items-stretch justify-center w-full max-w-xl">
			{candidateRankList.map((rank, index) => {
				const error = errors.votes?.[index]?.candidateId;

				return (
					<div key={rank} className="flex w-full justify-start join">
						<span className="btn text-xl join-item">{`${rank}. `}</span>
						<label className="form-control w-full join-item">
							<select
								className={twMerge(
									"select grow select-bordered",
									error ? "select-error" : undefined,
								)}
								{...register(`votes.${index}.candidateId`)}
							>
								{candidatesReordered.map((candidateOption) => (
									<option value={candidateOption.id} key={candidateOption.id}>
										{
											question.candidates.find(
												(c) => c.id === candidateOption.id,
											)?.name
										}
									</option>
								))}
							</select>
							{error?.message ? (
								<div className="label">
									<span className="label-text-alt">{error.message}</span>
								</div>
							) : null}
						</label>
					</div>
				);
			})}
			<div className="flex gap-2 justify-center">
				<Button
					className={twMerge(
						lastVote?.type === "Abstain" ? "btn-accent" : "btn-outline",
					)}
					onClick={() => {
						castVote({ type: "Abstain" });
					}}
				>
					Abstain
				</Button>
				<Button
					onClick={onSubmit}
					className={twMerge(
						lastVote?.type === "PreferentialVote" && !isDirty
							? "btn-accent"
							: "btn-outline",
					)}
				>
					Cast Vote
				</Button>
			</div>
		</div>
	);
}

function QuestionVoting({ data }: { data: QuestionVotingData }) {
	const { question } = data;

	return (
		<div className="flex flex-col items-center gap-6 w-full">
			<Question>{question.question}</Question>

			{question.details.type === "SingleVote" ? (
				<SingleQuestionVoting data={data} />
			) : (
				<PreferentialQuestionVoting data={data} />
			)}
		</div>
	);
}

function ViewingResults({ data }: { data: ShowingResultsState }) {
	return (
		<div className="flex flex-col items-center gap-6">
			<Question>{data.question}</Question>
			<ResultsViewer results={data.results} />
		</div>
	);
}
