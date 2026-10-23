import { CaptainTag } from './Chip';

export type Side = 'champion' | 'challenger';

export const TEAM_LABEL: Record<Side, string> = { champion: 'Sem Colete', challenger: 'Com Colete' };

// Cores de cada time: azul-mar (Sem Colete) e laranja (Com Colete), com o texto que contrasta.
const TEAM_FILL: Record<Side, string> = { champion: 'bg-sea text-sea-ink', challenger: 'bg-vest text-vest-ink' };

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

// Escalação de um time: faixa com a cor do time no topo e a lista embaixo.
// Ocupa a altura toda da célula, então os dois times lado a lado ficam do mesmo tamanho. `win` põe o troféu na faixa.
export function Lineup({ side, players, win = false, title }: { side: Side; players: LineupPlayer[]; win?: boolean; title?: string }) {
  return (
    <div className="h-full min-w-0 flex flex-col rounded-[16px] border-[3px] border-line bg-surface overflow-hidden">
      <h4 className={`font-display font-bold text-[15px] px-2.5 py-1.5 border-b-[3px] border-line flex items-center gap-1 ${TEAM_FILL[side]}`}>
        <span className="flex-1 min-w-0 truncate">{title ?? TEAM_LABEL[side]}</span>
        {win && <span aria-hidden="true">🏆</span>}
        {win && <span className="sr-only"> (venceu)</span>}
      </h4>
      <ul className="flex-1 flex flex-col gap-0.5 font-bold px-2.5 py-2">
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

// Placar de sets: caixa de cada time na cor dele e o "X" no meio.
// `names` mostra o nome do time em cima da caixa (desligue quando a escalação logo abaixo já mostra).
export function Scoreboard({ a, b, big = false, names = true }: { a: number; b: number; big?: boolean; names?: boolean }) {
  const box = (side: Side, n: number) => (
    <div className="flex flex-col items-center gap-1 min-w-0">
      {names && <div className="font-display font-bold text-[15px] truncate max-w-full">{TEAM_LABEL[side]}</div>}
      <div
        className={`font-display font-bold leading-none tabular-nums rounded-[18px] border-[3px] border-line shadow-pop text-center ${TEAM_FILL[side]} ${
          big ? 'text-[56px] min-w-[104px] px-4 py-3' : 'text-[40px] min-w-[84px] px-3 py-2'
        }`}
      >
        {n}
      </div>
    </div>
  );
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2" role="img" aria-label={`Sem Colete ${a} a ${b} Com Colete`}>
      {box('champion', a)}
      <div aria-hidden="true" className={`font-display font-bold text-muted ${big ? 'text-3xl pb-5' : 'text-2xl pb-3.5'}`}>X</div>
      {box('challenger', b)}
    </div>
  );
}
