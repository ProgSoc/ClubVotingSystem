import { createFileRoute, redirect } from "@tanstack/react-router";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/b/$shortId")({
	beforeLoad: async ({ params, context: { queryClient } }) => {
		const shortRoomQuery = await queryClient.ensureQueryData(
			trpc.room.getRoomByShortId.queryOptions({ shortId: params.shortId }),
		);

		if (!shortRoomQuery) {
			throw redirect({
				to: "/",
			});
		}

		throw redirect({
			to: "/room/$roomId/board",
			params: { roomId: shortRoomQuery.id },
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <>Redirecting...</>;
}
