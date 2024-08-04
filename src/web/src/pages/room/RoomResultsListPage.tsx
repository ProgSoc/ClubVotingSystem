import type { RoomPublicInfo } from '@server/room/types';
import { ResultsViewer } from 'components/ResultsViewer';
import { Heading, PageContainer, Question } from 'components/styles';
import { trpc } from 'utils/trpc';

export function RoomResultsListPage(props: { roomId: string; room: RoomPublicInfo }) {
  const roomResults = trpc.room.getResults.useQuery({ roomId: props.roomId });

  return (
    <PageContainer className="gap-4">
      <Heading>{props.room.name}</Heading>
      <div className="flex flex-col gap-8">
        {!roomResults.data
          ? (
              <Question>Loading...</Question>
            )
          : (
              roomResults.data.map(result => (
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
