import type { ResultsView } from '@server/live/question';
import { UnreachableError } from '@server/unreachableError';
import { twMerge } from 'tailwind-merge';

function asWidthPercentage(val: number, max: number) {
  const value = val / max;
  const valueScaled = 1 - (1 - value) * (1 - 0.05);
  return `${valueScaled * 100}%`;
}

function ResultBar(props: { name: string; votes: number; max: number; grey?: boolean }) {
  return (
    <div className="flex gap-4 items-center">
      <div className="flex-1 text-right">{props.name}</div>
      <div className="flex-1">
        <div className="flex gap-2">
          <div className="w-32 sm:w-64 h-6 flex items-center">
            <div
              className={twMerge('h-full rounded-md', props.grey ? 'bg-neutral-content' : 'bg-accent')}
              style={{
                width: asWidthPercentage(props.votes, props.max),
              }}
            />
            <div className="ml-2">{props.votes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResultsViewer({ results }: { results: ResultsView }) {
  switch (results.type) {
    case 'SingleVote': {
      const candidates = results.results.sort((a, b) => b.votes - a.votes);
      const maxVote = Math.max(results.abstained, ...results.results.map(v => v.votes));

      return (
        <div className="flex flex-col gap-4">
          {candidates.map(result => (
            <ResultBar key={result.id} name={result.name} votes={result.votes} max={maxVote} />
          ))}
          <ResultBar name="Abstained" votes={results.abstained} max={maxVote} grey={true} />
        </div>
      );
    }
    case 'PreferentialVote': {
      const candidates = results.results.sort((a, b) => b.rank - a.rank);
      const maxVote = Math.max(results.abstained, ...results.results.map(v => v.rank));

      return (
        <div className="flex flex-col gap-4">
          {candidates.map(result => (
            <ResultBar key={result.id} name={result.name} votes={result.rank} max={maxVote} />
          ))}
          <ResultBar name="Abstained" votes={results.abstained} max={maxVote} grey={true} />
        </div>
      );
    }
    // default:
    //   throw new UnreachableError(results.type);
  }
}
