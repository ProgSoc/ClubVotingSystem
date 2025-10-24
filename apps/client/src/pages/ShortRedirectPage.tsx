import { useQuery } from "@tanstack/react-query";
import { CenteredPageContainer, Heading } from "components/styles";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "utils/trpc";
import { cacheFetchedRoom } from "utils/withRoomData";

interface ShortRedirectPageProps {
	makePath: (roomId: string) => string;
	shortId: string;
}

export function ShortRedirectPageInner(props: ShortRedirectPageProps) {
	const navigate = useNavigate();

	const roomQuery = useQuery(
		trpc.room.getRoomByShortId.queryOptions({
			shortId: props.shortId,
		}),
	);

	useEffect(() => {
		if (roomQuery.data?.id) {
			cacheFetchedRoom(roomQuery.data);
			navigate(props.makePath(roomQuery.data.id));
		}
	}, [roomQuery.data?.id, props.makePath, navigate, roomQuery.data]);

	return (
		<CenteredPageContainer className="gap-2">
			<Heading>Redirecting...</Heading>
			{roomQuery.data && !roomQuery.data.id && <p>Room not found</p>}
		</CenteredPageContainer>
	);
}

export function ShortRedirectPage(
	makePath: ShortRedirectPageProps["makePath"],
) {
	return (props: { shortId: string }) => (
		<ShortRedirectPageInner {...props} makePath={makePath} />
	);
}
