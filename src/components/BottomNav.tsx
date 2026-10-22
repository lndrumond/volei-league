'use client';

import Link from 'next/link';

type Tab = 'dashboard' | 'ranking' | 'partida' | 'historico';

const TABS: { id: Tab; label: string; icon: string; path: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠', path: '' },
  { id: 'ranking', label: 'Ranking', icon: '🏆', path: '/ranking' },
  { id: 'partida', label: 'Partida', icon: '🏐', path: '/game' },
  { id: 'historico', label: 'Histórico', icon: '📖', path: '/history' },
];

// Barra inferior fixa com as 4 abas. As páginas que a usam precisam de espaço embaixo (pb-24).
export default function BottomNav({ slug, active }: { slug: string; active: Tab }) {
  return (
    <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t-4 border-green-200">
      <ul className="max-w-md mx-auto grid grid-cols-4">
        {TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={`/g/${slug}${t.path}`}
              aria-current={active === t.id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 min-h-16 font-black text-xs ${
                active === t.id ? 'text-orange-600 bg-orange-50' : 'text-gray-500'
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">{t.icon}</span>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
