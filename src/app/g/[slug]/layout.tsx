'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import BottomNav, { type Tab } from '@/components/BottomNav';
import Novidades from '@/components/Novidades';
import { AUTH_EVENT, getStoredRole } from '@/lib/avlClient';

// A barra fica aqui, no layout da liga, para não sumir quando a página muda: só o conteúdo troca.
export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams() as { slug: string };
  const pathname = usePathname();
  const base = `/g/${slug}`;

  const [isAdmin, setIsAdmin] = useState(false);
  const [voteUnlocked, setVoteUnlocked] = useState(false);

  // Relê o login quando a página muda ou quando alguém entra/sai (PIN do admin ou chave mestra).
  useEffect(() => {
    const read = () => {
      setIsAdmin(getStoredRole(slug) === 'admin');
      try { setVoteUnlocked(Boolean(sessionStorage.getItem(`superadmin_${slug}`))); } catch { setVoteUnlocked(false); }
    };
    read();
    window.addEventListener(AUTH_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(AUTH_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, [slug, pathname]);

  let active: Tab | null = null;
  if (pathname === base) active = 'dashboard';
  else if (pathname === `${base}/ranking`) active = 'ranking';
  else if (pathname === `${base}/game`) active = 'partida';
  else if (pathname === `${base}/history`) active = 'historico';
  else if (pathname === `${base}/super-admin` && isAdmin) active = 'votacao';

  return (
    <>
      {children}
      {active && <BottomNav slug={slug} active={active} showVote={isAdmin} voteUnlocked={voteUnlocked} />}
      {active && <Novidades />}
    </>
  );
}
