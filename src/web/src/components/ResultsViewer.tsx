import type { ResultsView } from '../../../server/src/live-room/question-states';
import { UnreachableError } from '../../../server/src/unreachableError';

export function ResultsViewer({ results }: { results: ResultsView }) {
  switch (results.type) {
    case 'SingleVote':
      const candidates = results.results.sort((a, b) => b.votes - a.votes);
      const maxVote = Math.max(...results.results.map((v) => v.votes));

      return (
        <div className="flex flex-col gap-4">
          {candidates.map((result) => (
            <div key={result.id} className="flex gap-4 items-center">
              <div className="flex-1">{result.name}</div>
              <div className="flex-1">
                <div className="flex gap-2">
                  <div className="w-64 h-6 flex items-center">
                    <div
                      className="bg-accent h-full rounded-md"
                      style={{
                        width: `${(result.votes / maxVote) * 100}%`,
                      }}
                    />
                    <div className="ml-2">{result.votes}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );

    default:
      throw new UnreachableError(results.type);
  }
}
