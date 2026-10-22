import type { ButtonHTMLAttributes } from 'react';

type Variant = 'plain' | 'sun' | 'sea' | 'vest' | 'danger';
type Size = 'md' | 'sm';

const VARIANTS: Record<Variant, string> = {
  plain: 'bg-surface text-ink',
  sun: 'bg-sun text-sun-ink',
  sea: 'bg-sea text-sea-ink',
  vest: 'bg-vest text-vest-ink',
  danger: 'bg-danger text-danger-ink',
};

const SIZES: Record<Size, string> = {
  md: 'text-lg min-h-[54px] px-[18px] py-3',
  sm: 'text-[15px] min-h-11 px-3.5 py-2',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Ocupa a largura toda (padrão). Use `inline` para botão do tamanho do texto. */
  inline?: boolean;
}

// Botão "fliperama": contorno grosso, cantos arredondados e sombra que afunda ao toque.
export default function Button({ variant = 'plain', size = 'md', inline = false, className = '', type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={[
        'font-display font-bold border-[3px] border-line rounded-[18px] shadow-pop transition-[transform,box-shadow] duration-75',
        'enabled:active:translate-y-[3px] enabled:active:shadow-press disabled:opacity-50 disabled:cursor-not-allowed',
        inline ? 'w-auto shrink-0' : 'w-full',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
