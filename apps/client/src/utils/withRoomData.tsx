import { useQuery } from "@tanstack/react-query";
import { CenteredPageContainer, Heading } from "components/styles";
import type { RoomPublicInfo } from "server/src/room/types";
import { trpc } from "./trpc";

const cachedRooms: Record<string, RoomPublicInfo | undefined> = {};

export function withRoomFetched<Props extends { room: RoomPublicInfo }>(
	Component: React.ComponentType<Props>,
) {
	return function RoomFetched(props: { roomId: string } & Omit<Props, "room">) {
		const roomQuery = useQuery(
			trpc.room.getRoomById.queryOptions(
				{ id: props.roomId },
				{
					enabled: !cachedRooms[props.roomId],
				},
			),
		);

		if (roomQuery.data) {
			cachedRooms[props.roomId] = roomQuery.data;
		}

		const room = cachedRooms[props.roomId];
		if (!room) {
			return (
				<CenteredPageContainer>
					<Heading>Loading room...</Heading>
				</CenteredPageContainer>
			);
		} else {
			// biome-ignore lint/suspicious/noExplicitAny: This will be part of the router refactor
			return <Component room={room} {...(props as any)} />;
		}
	};
}

export function cacheFetchedRoom(room: RoomPublicInfo) {
	cachedRooms[room.id] = room;
}
