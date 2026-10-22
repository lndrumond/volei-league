import { CaptainTag } from './Chip';

export type Side = 'champion' | 'challenger';

export const TEAM_LABEL: Record<Side, string> = { champion: 'Sem Colete', challenger: 'Com Colete' };

// Bolinha da cor do time: azul-mar (Sem Colete) ou laranja (Com Colete).
export function TeamDot({ side }: { side: Side }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-3 h-3 rounded-full border-2 border-line align-[-1px] mr-1.5 shrink-0 ${side === 'champion' ? 'bg-sea' : 'bg-vest'}`}
    />
  );
}

export interface LineupPlayer { name: string; captain?: boolean }

// Escalação de um time. `win` destaca o vencedor com contorno forte e fundo de cartão.
export function Lineup({ side, players, win = false, title }: { side: Side; players: LineupPlayer[]; win?: boolean; title?: string }) {
  return (
    <div className={`rounded-[16px] p-2.5 min-w-0 border-2 ${win ? 'bg-surface border-line' : 'bg-surface2 border-soft'}`}>
      <h4 className="font-display font-bold text-[15px] mb-1.5">
        <TeamDot side={side} />
        {title ?? TEAM_LABEL[side]}
        {win && <span className="sr-only"> (venceu)</span>}
      </h4>
      <ul className="flex flex-col gap-0.5 font-bold">
        {players.map((p, i) => (
          <li key={`${p.name}-${i}`}>
            {p.name}
            {p.captain && <CaptainTag />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Placar grande "6 x 3" com o nome dos times nas pontas.
export function Scoreboard({ a, b, big = false }: { a: number; b: number; big?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
      <div className="font-display font-bold text-[15px] min-w-0"><TeamDot side="champion" />Sem Colete</div>
      <div
        className={`font-display font-bold leading-none tabular-nums ${big ? 'text-[54px]' : 'text-[40px]'}`}
        aria-label={`${a} a ${b}`}
      >
        {a}<span className="text-2xl text-muted"> x </span>{b}
      </div>
      <div className="font-display font-bold text-[15px] min-w-0"><TeamDot side="challenger" />Com Colete</div>
    </div>
  );
}
