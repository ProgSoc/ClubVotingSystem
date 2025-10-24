import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { WaitingRoomPage } from "pages/room/WaitingRoomPage";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/room/$roomId/wait/$userId")({
	component: RouteComponent,
});

function RouteComponent() {
	const roomId = Route.useParams({
		select: (p) => p.roomId,
	});
	const userId = Route.useParams({
		select: (p) => p.userId,
	});

	const roomData = useSuspenseQuery(
		trpc.room.getRoomById.queryOptions({
			id: roomId,
		}),
	);

	return (
		<WaitingRoomPage room={roomData.data} roomId={roomId} userId={userId} />
	);
}
