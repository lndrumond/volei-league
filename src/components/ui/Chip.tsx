import type { ButtonHTMLAttributes, ReactNode } from 'react';

// Filtro em forma de pílula. Marcado (`pressed`) fica amarelo-sol.
export function Chip({ pressed, className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={[
        'border-2 border-line rounded-full px-3.5 py-2 min-h-11 font-extrabold text-sm',
        pressed ? 'bg-sun text-sun-ink' : 'bg-surface text-ink',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}

// Selo "capitão".
export function CaptainTag({ short = false }: { short?: boolean }) {
  return (
    <span className="ml-1 text-[11px] font-extrabold bg-sun text-sun-ink border-[1.5px] border-line rounded-full px-1.5 py-px align-middle">
      {short ? 'cap.' : 'capitão'}
    </span>
  );
}

// Selo "visitante".
export function GuestTag() {
  return <span className="ml-1.5 text-[13px] font-bold text-muted">visitante</span>;
}

export type ChipSide = 'champion' | 'challenger' | 'bench';

const SIDE_STYLE: Record<ChipSide, string> = {
  champion: 'border-sea bg-sea/15',
  challenger: 'border-vest bg-vest/20',
  bench: 'border-soft bg-surface',
};

interface PlayerChipProps {
  name: string;
  /** Cor do time: azul-mar (Sem Colete), laranja (Com Colete) ou neutro (banco de areia). */
  side?: ChipSide;
  captain?: boolean;
  guest?: boolean;
  /** Se informado, o chip vira botão (ex.: tocar para mover de time). */
  onClick?: () => void;
  ariaLabel?: string;
  trailing?: ReactNode;
}

// Nome de jogador. Sem `onClick` é só texto; com `onClick` é um botão grande, fácil de tocar.
export function PlayerChip({ name, captain, guest, side, onClick, ariaLabel, trailing }: PlayerChipProps) {
  const content = (
    <span className="flex-1 min-w-0">
      {name}
      {captain && <CaptainTag short />}
      {guest && <GuestTag />}
    </span>
  );
  if (!onClick) return <span className="flex items-center gap-2 font-bold min-h-8">{content}{trailing}</span>;
  const tone = SIDE_STYLE[side ?? 'bench'];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-full flex items-center justify-between gap-2 text-left font-bold min-h-11 px-3 py-2 rounded-[14px] border-2 text-ink ${tone}`}
    >
      {content}
      {trailing ?? <span aria-hidden="true" className="text-muted text-base">⇄</span>}
    </button>
  );
}
