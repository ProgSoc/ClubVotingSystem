import { createFileRoute } from "@tanstack/react-router";
import { JoinWaitingRoomPage } from "pages/room/JoinWaitingRoomPage";

export const Route = createFileRoute("/join/$roomId")({
	component: RouteComponent,
});

function RouteComponent() {
	const roomId = Route.useParams({
		select: (p) => p.roomId,
	})

	return <JoinWaitingRoomPage roomId={roomId} />;
}
