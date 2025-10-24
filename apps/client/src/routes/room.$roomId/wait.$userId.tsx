import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CenteredPageContainer, Heading } from "components/styles";
import { useEffect, useState } from "react";
import { RoomUserResolvedState } from "server/src/live/user";
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

	const navigate = Route.useNavigate();

	const [state, setState] = useState<RoomUserResolvedState | null>(null);

	const response = useQuery(
		trpc.waitingRoom.waitResponse.queryOptions({
			roomId: roomId,
			userId: userId,
		}),
	);

	useEffect(() => {
		if (response.data) {
			setState(response.data);
			if (RoomUserResolvedState.is.admitted(response.data)) {
				navigate({
					to: "/room/$roomId/vote/$userId/$votingKey",
					params: {
						roomId: roomId,
						userId: userId,
						votingKey: response.data.votingKey,
					},
				});
			}
		}
	}, [response.data, navigate, roomId, userId]);

	if (!state) {
		return (
			<CenteredPageContainer>
				<Heading>Waiting to be accepted...</Heading>
			</CenteredPageContainer>
		);
	}

	return RoomUserResolvedState.match(state, {
		declined: () => (
			<CenteredPageContainer>
				<Heading>Sorry, you were declined.</Heading>
			</CenteredPageContainer>
		),
		admitted: () => (
			<CenteredPageContainer>
				<Heading>Admitted</Heading>
			</CenteredPageContainer>
		),
		kicked: () => (
			<CenteredPageContainer>
				<Heading>Sorry, you were kicked.</Heading>
			</CenteredPageContainer>
		),
	});
}
