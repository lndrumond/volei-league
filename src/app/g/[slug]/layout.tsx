'use client';

import { useParams, usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

type Tab = 'dashboard' | 'ranking' | 'partida' | 'historico';

// A barra fica aqui, no layout da liga, para não sumir quando a página muda: só o conteúdo troca.
export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string };
  const pathname = usePathname();
  const base = `/g/${slug}`;

  let active: Tab | null = null;
  if (pathname === base) active = 'dashboard';
  else if (pathname === `${base}/ranking`) active = 'ranking';
  else if (pathname === `${base}/game`) active = 'partida';
  else if (pathname === `${base}/history`) active = 'historico';

  return (
    <>
      {children}
      {active && <BottomNav slug={slug} active={active} />}
    </>
  );
}
