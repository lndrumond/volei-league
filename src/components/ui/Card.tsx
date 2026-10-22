import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLElement> {
  /** Cartão mais compacto, para telas com muita informação. */
  slim?: boolean;
}

export default function Card({ slim = false, className = '', ...rest }: Props) {
  return (
    <section
      className={[
        'bg-surface text-ink border-[3px] border-line rounded-card shadow-pop flex flex-col',
        slim ? 'px-3.5 py-3 gap-2' : 'p-4 gap-3',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}

// Rótulo pequeno em caixa alta, acima de um campo ou bloco.
export function Eyebrow({ className = '', ...rest }: HTMLAttributes<HTMLElement>) {
  return <p className={`font-extrabold text-xs tracking-[0.08em] uppercase text-muted ${className}`} {...rest} />;
}

// Texto de apoio, em tom mais suave.
export function Sub({ className = '', ...rest }: HTMLAttributes<HTMLElement>) {
  return <p className={`text-sm text-muted ${className}`} {...rest} />;
}
