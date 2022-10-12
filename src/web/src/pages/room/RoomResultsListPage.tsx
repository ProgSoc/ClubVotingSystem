import type { PublicStaticRoomData } from '@server/rooms';
import { ResultsViewer } from 'components/ResultsViewer';
import { AdminPageContainer, Heading, PageContainer, Question } from 'components/styles';
import { trpc } from 'utils/trpc';

export function RoomResultsListPage(props: { roomId: string; room: PublicStaticRoomData }) {
  const roomResults = trpc.useQuery(['room.getResults', { roomId: props.roomId }]);

  return (
    <AdminPageContainer className="gap-4">
      <Heading>{props.room.name}</Heading>
      <div className="flex flex-col gap-8">
        {!roomResults.data ? (
          <Question>Loading...</Question>
        ) : (
          roomResults.data.map((result) => (
            <div key={result.questionId}>
              <Question className="mb-4">{result.name}</Question>
              <ResultsViewer results={result.result} />
            </div>
          ))
        )}
      </div>
    </AdminPageContainer>
  );
}
