import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CenteredPageContainer, Heading } from "components/styles";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/room/$roomId")({
	component: RouteComponent,
	loader: async ({ params: { roomId }, context: { queryClient } }) => {
		const roomData = await queryClient.ensureQueryData(
			trpc.room.getRoomById.queryOptions({ id: roomId }),
		);

		return { room: roomData };
	},
});

function RouteComponent() {
	const roomId = Route.useParams({
		select: (p) => p.roomId,
	});

	const roomQuery = useQuery(
		trpc.room.getRoomById.queryOptions({ id: roomId }),
	);

	if (roomQuery.isLoading) {
		return (
			<CenteredPageContainer>
				<Heading>Loading room...</Heading>
			</CenteredPageContainer>
		);
	}

	if (roomQuery.isError) {
		return (
			<CenteredPageContainer>
				<Heading>Error loading room: {roomQuery.error.message}</Heading>
			</CenteredPageContainer>
		);
	}

	return <Outlet />;
}
