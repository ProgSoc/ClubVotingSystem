import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ResultsViewer } from "components/ResultsViewer";
import { Heading, PageContainer, Question } from "components/styles";
import { trpc } from "utils/trpc";

export const Route = createFileRoute("/room/$roomId/results")({
	component: RouteComponent,
});

// function RouteComponent() {
// 	const roomId = Route.useParams({
// 		select: (p) => p.roomId,
// 	});

// 	const roomData = useSuspenseQuery(
// 		trpc.room.getRoomById.queryOptions({
// 			id: roomId,
// 		}),
// 	);

// 	return <RoomResultsListPage roomId={roomId} room={roomData.data} />;
// }

export function RouteComponent() {
	const { roomId } = Route.useParams();

	const roomResults = useQuery(trpc.room.getResults.queryOptions({ roomId }));

	const roomData = useSuspenseQuery(
		trpc.room.getRoomById.queryOptions({
			id: roomId,
		}),
	);

	return (
		<PageContainer className="gap-4">
			<Heading>{roomData.data.name}</Heading>
			<div className="flex flex-col gap-8">
				{!roomResults.data ? (
					<Question>Loading...</Question>
				) : (
					roomResults.data.map((result) => (
						<div key={result.questionId}>
							<Question className="mb-4">{result.question}</Question>
							<ResultsViewer results={result.results} />
						</div>
					))
				)}
			</div>
		</PageContainer>
	);
}
