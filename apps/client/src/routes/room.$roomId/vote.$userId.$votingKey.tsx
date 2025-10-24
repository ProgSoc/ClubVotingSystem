import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { VotingRoomPage } from "pages/room/VotingRoomPage";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/room/$roomId/vote/$userId/$votingKey")({
	component: RouteComponent,
});

function RouteComponent() {
	const { roomId, userId, votingKey } = Route.useParams();

	const roomData = useSuspenseQuery(
		trpc.room.getRoomById.queryOptions({
			id: roomId,
		}),
	);

	return (
		<VotingRoomPage
			room={roomData.data}
			roomId={roomId}
			userId={userId}
			votingKey={votingKey}
		/>
	);
}
