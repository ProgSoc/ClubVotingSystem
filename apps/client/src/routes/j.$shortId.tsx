import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryClient, trpc } from "utils/trpc";

export const Route = createFileRoute("/j/$shortId")({
	beforeLoad: async ({ params }) => {
		const shortRoomQuery = await queryClient.ensureQueryData(
			trpc.room.getRoomByShortId.queryOptions({ shortId: params.shortId }),
		);

		if (!shortRoomQuery) {
			throw redirect({
				to: "/",
			});
		}

		throw redirect({
			to: "/join/$roomId",
			params: { roomId: shortRoomQuery.id },
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	return <>Redirecting...</>;
}
