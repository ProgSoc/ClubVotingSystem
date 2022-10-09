import { ResultsViewer } from 'components/ResultsViewer';
import { Heading, PageContainer, Question } from 'components/styles';

import type { PublicStaticRoomData } from '../../../../server/src/rooms';
import { trpc } from '../../utils/trpc';

export function RoomResultsListPage(props: { roomId: string; room: PublicStaticRoomData }) {
  const roomResults = trpc.useQuery(['room.getResults', { roomId: props.roomId }]);

  return (
    <PageContainer>
      <Heading>{props.room.name}</Heading>
      {!roomResults.data ? (
        <Question>Loading...</Question>
      ) : (
        roomResults.data.map((result) => (
          <div key={result.questionId}>
            <Question>{result.name}</Question>
            <ResultsViewer results={result.result} />
          </div>
        ))
      )}
    </PageContainer>
  );
}
