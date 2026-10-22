'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type Tab = 'dashboard' | 'ranking' | 'partida' | 'historico';

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS: Record<Tab, ReactNode> = {
  dashboard: svg(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9.5h13V10" /><path d="M10 19.5v-5h4v5" /></>),
  ranking: svg(<><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4" /><path d="M12 13v4M8.5 20h7M10 17h4" /></>),
  partida: svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5c-2.5 3-2.5 14 0 17M3.7 9.5c4.5 1.5 12.5 1.5 16.6 0M3.7 14.5c4.5-1.5 12.5-1.5 16.6 0" /></>),
  historico: svg(<><path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" /><path d="M8 17h10M9 8.5h5M9 12h5" /></>),
};

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: 'dashboard', label: 'Dashboard', path: '' },
  { id: 'ranking', label: 'Ranking', path: '/ranking' },
  { id: 'partida', label: 'Partida', path: '/game' },
  { id: 'historico', label: 'Histórico', path: '/history' },
];

// Barra inferior fixa com as 4 abas (estilo "Clash Royale"). Fica no layout da liga, por isso não some na troca de tela.
// As páginas precisam de espaço embaixo (pb-28), por causa da barra fixa.
export default function BottomNav({ slug, active }: { slug: string; active: Tab }) {
  return (
    <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-[60] bg-surface border-t-[3px] border-line pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
      <ul className="max-w-md mx-auto grid grid-cols-4 gap-1 px-1.5">
        {TABS.map((t) => {
          const on = active === t.id;
          return (
            <li key={t.id}>
              <Link
                href={`/g/${slug}${t.path}`}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 min-h-[54px] rounded-[14px] font-extrabold text-xs ${
                  on ? 'bg-sun text-sun-ink' : 'text-muted'
                }`}
              >
                {ICONS[t.id]}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
