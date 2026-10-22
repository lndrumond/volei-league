import Image from 'next/image';
import type { ReactNode } from 'react';

// Barra do topo: logo, nome do app e o nome da tela. `right` leva ações (ex.: tag Admin e Sair).
export default function AppHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="flex items-center gap-2.5 bg-sea text-sea-ink border-[3px] border-line rounded-card shadow-pop px-3.5 py-2.5">
      <Image src="/logo.png" alt="" width={44} height={44} unoptimized className="h-11 w-11 object-contain shrink-0" />
      <div className="flex-1 min-w-0 leading-tight">
        <div className="font-display font-bold text-lg truncate">Amigos do Vôlei</div>
        <div className="text-xs font-bold opacity-90 truncate">League · {title}</div>
      </div>
      {right}
    </header>
  );
}

export function AdminTag() {
  return (
    <span className="font-extrabold text-[11px] tracking-[0.06em] uppercase rounded-full px-2.5 py-1 bg-sun text-sun-ink border-2 border-line">
      Admin
    </span>
  );
}
