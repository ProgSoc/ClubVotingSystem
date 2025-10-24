import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import { Heading } from "components/styles";
import { useState } from "react";
import { BoardState } from "server/src/live/states";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/room/$roomId/admin/$adminKey/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { roomId } = Route.useParams();

	const [roomVoters, setRoomVoters] = useState(0);

	const roomData = useSuspenseQuery(
		trpc.room.getRoomById.queryOptions({
			id: roomId,
		}),
	);

	useSubscription(
		trpc.room.listenBoardEvents.subscriptionOptions(
			{ roomId: roomId },
			{
				onData: (data) => {
					BoardState.match(data, {
						blank: (data) => setRoomVoters(data.totalPeople),
						showingQuestion: (data) => setRoomVoters(data.totalPeople),
						showingResults: (data) => setRoomVoters(data.totalPeople),
						ended: (_data) => setRoomVoters(0),
					});
				},
			},
		),
	);

	// const boardLink =
	// 	location.origin + routeBuilders.shortView({ shortId: props.room.shortId });

	return (
		<>
			<p>
				People admitted into the room:
				{roomVoters}
			</p>

			<div className="flex flex-col items-center gap-4">
				<div>
					<Heading className="text-2xl md:text-3xl m-3">View board</Heading>
					<Link
						target="_blank"
						rel="noreferrer"
						to="/b/$shortId"
						params={{ shortId: roomData.data.shortId }}
						className="text-sm md:text-xl underline text-info font-mono"
					>
						{`${location.origin}/b/${roomData.data.shortId}`}
					</Link>
				</div>
				<Link
					target="_blank"
					rel="noreferrer"
					to="/room/$roomId/results"
					params={{ roomId: roomId }}
					className="btn btn-accent m-3"
				>
					View Results
				</Link>
			</div>
		</>
	);
}
