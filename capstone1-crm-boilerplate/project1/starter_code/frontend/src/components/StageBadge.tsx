import { STAGE_COLOURS, formatStage } from '../constants.ts';
import type { DealStage } from '../types.ts';

export default function StageBadge({ stage }: { stage: DealStage }) {
  const colour = STAGE_COLOURS[stage] ?? 'secondary';
  const dark = colour === 'warning' || colour === 'info' ? ' text-dark' : '';
  return <span className={`badge rounded-pill text-bg-${colour}${dark}`}>{formatStage(stage)}</span>;
}
