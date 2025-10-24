import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import { QRCodeRender } from "components/QRCode";
import { ResultsViewer } from "components/ResultsViewer";
import { CenteredPageContainer, Heading, Question } from "components/styles";
import { BoardState } from "server/src/live/states";
import type { RoomPublicInfo } from "server/src/room/types";
import { twMerge } from "tailwind-merge";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/room/$roomId/board")({
	component: RouteComponent,
});

export function RouteComponent() {
	const roomId = Route.useParams({
		select: (p) => p.roomId,
	});

	const roomData = useSuspenseQuery(
		trpc.room.getRoomById.queryOptions({
			id: roomId,
		}),
	);

	return (
		<CenteredPageContainer>
			<Heading className="text-accent mb-8">{roomData.data.name}</Heading>
			<div className="flex flex-col lg:flex-row items-center gap-24">
				<JoinPanel room={roomData.data} />
				<StatusPanel room={roomData.data} />
			</div>
		</CenteredPageContainer>
	);
}

function JoinPanel(props: { room: RoomPublicInfo; className?: string }) {
	const joinLink = `${location.origin}/j/${props.room.shortId}`;

	const boardLink = `${location.origin}/b/${props.room.shortId}`;

	return (
		<div
			className={twMerge(
				"flex flex-col items-center md:bg-base-300 shadow-lg px-8 py-10 md:p-10 pt-1 md:pt-5 rounded-2xl",
				props.className,
			)}
		>
			<div className="flex flex-col gap-5 py-10 items-center">
				<Heading className="text-3xl md:text-4xl pb-3">
					Join voting room
				</Heading>
				<QRCodeRender content={joinLink} />
				{joinLink && (
					<p>
						<Link
							target="_blank"
							rel="noreferrer"
							to="/j/$shortId"
							params={{ shortId: props.room.shortId }}
							className="text-sm md:text-xl underline text-info font-mono"
						>
							{joinLink}
						</Link>
					</p>
				)}
			</div>
			<div className="flex flex-col gap-2 items-center">
				<Heading className="text-2xl md:text-3xl">View board</Heading>
				{joinLink && (
					<p>
						<Link
							target="_blank"
							rel="noreferrer"
							to="/b/$shortId"
							params={{ shortId: props.room.shortId }}
							className="text-sm md:text-xl underline text-info font-mono"
						>
							{boardLink}
						</Link>
					</p>
				)}
			</div>
		</div>
	);
}

function StatusPanel(props: { room: RoomPublicInfo }) {
	const { data: state } = useSubscription(
		trpc.room.listenBoardEvents.subscriptionOptions({ roomId: props.room.id }),
	);

	if (!state) {
		return <Heading>Loading...</Heading>;
	}

	return BoardState.match(state, {
		blank: () => (
			<div className="flex flex-col">
				<Heading>Waiting for a question...</Heading>
			</div>
		),

		showingQuestion: (state) => (
			<div className="flex flex-col gap-4">
				<Question>{state.question}</Question>

				<div className="flex gap-8 flex-col items-start">
					<div className="flex flex-col gap-4">
						<div>
							<div>
								Votes remaining:
								{state.totalPeople - state.peopleVoted}
							</div>
							<progress
								className="progress progress-info w-48"
								max={state.totalPeople}
								value={state.peopleVoted}
							/>
						</div>
					</div>
					<div>
						<div className="flex flex-col gap-2 items-start flex-wrap max-h-[360px]">
							{state.candidates.map((candidate) => (
								<div className="alert min-w-[10rem] w-full" key={candidate.id}>
									{candidate.name}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		),

		showingResults: (state) => (
			<div className="flex flex-col items-center gap-4">
				<Question>{state.question}</Question>
				<ResultsViewer results={state.results} />
			</div>
		),

		ended: () => <Heading>Room closed</Heading>,
	});
}
