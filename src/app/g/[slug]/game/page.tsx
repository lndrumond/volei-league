'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getStoredRole } from '@/lib/avlClient';
import { lineupNames, countSets } from '@/lib/teams';
import { Button, Card, ConfirmModal, EmptyState, Eyebrow, Lineup, Scoreboard, Sub, useToast } from '@/components/ui';
import AppHeader, { AdminTag } from '@/components/AppHeader';

interface SessionRow {
  id: string;
  description?: string | null;
  champion_name?: string | null;
  challenger_name?: string | null;
  champion_player_ids?: string[];
  challenger_player_ids?: string[];
}

// Aba "Partida": todos veem o placar ao vivo e a escalação. Só o admin vê os botões.
export default function Game() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sets, setSets] = useState<{ winner: string }[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'swap' | 'end' | null>(null);

  useEffect(() => { setIsAdmin(getStoredRole(slug) === 'admin'); }, [slug]);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, playRes] = await Promise.all([
        apiFetch(slug, `/api/sessions/active?slug=${slug}`),
        apiFetch(slug, `/api/players/list?slug=${slug}`).catch(() => null),
      ]);
      const data = await sessRes.json();
      setSession(data.activeSession || null);
      setSets(data.activeSession ? data.sets || [] : []);
      if (playRes && playRes.ok) {
        const pd = await playRes.json();
        const map: Record<string, string> = {};
        pd.players?.forEach((p: { id: string; name: string }) => { map[p.id] = p.name; });
        setPlayersMap(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  // Quem só assiste vê o placar atualizar sozinho.
  useEffect(() => {
    if (isAdmin) return;
    const t = setInterval(loadData, 8000);
    return () => clearInterval(t);
  }, [isAdmin, loadData]);

  const call = async (endpoint: string, body: object, failMsg: string) => {
    setBusy(true);
    try {
      const res = await apiFetch(slug, endpoint, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || failMsg);
        return false;
      }
      return true;
    } catch {
      toast.error(failMsg);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleWin = async (winner: 'champion' | 'challenger') => {
    if (!session) return;
    if (await call('/api/sets/record', { session_id: session.id, winner }, 'Erro ao anotar a vitória!')) loadData();
  };

  const handleUndo = async () => {
    if (!session || sets.length === 0) return;
    if (await call('/api/sets/undo', { session_id: session.id }, 'Não deu pra desfazer.')) loadData();
  };

  const handleSwap = async () => {
    if (!session) return;
    setConfirm(null);
    if (await call('/api/sessions/swap', { session_id: session.id }, 'Não deu pra trocar os times.')) {
      router.push(`/g/${slug}/setup`);
    }
  };

  const handleEnd = async () => {
    if (!session) return;
    setConfirm(null);
    if (await call('/api/sessions/end', { session_id: session.id }, 'Erro ao fechar a quadra.')) router.push(`/g/${slug}`);
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-bg text-ink p-4 pb-28 max-w-md mx-auto flex flex-col gap-3">
      <AppHeader title="Partida" right={isAdmin ? <AdminTag /> : undefined} />
      {children}
    </div>
  );

  if (loading) {
    return shell(
      <div className="text-center py-16">
        <div className="text-6xl animate-bounce" aria-hidden="true">🏐</div>
        <p className="font-display font-bold text-xl mt-3">Limpando os óculos...</p>
      </div>,
    );
  }

  // Sem partida
  if (!session) {
    return shell(
      <EmptyState
        icon="😴"
        title="Nenhuma partida no momento"
        text="Quando o admin iniciar, o placar ao vivo aparece aqui."
        action={isAdmin ? <Button variant="sun" onClick={() => router.push(`/g/${slug}/setup`)}>Iniciar partida</Button> : undefined}
      />,
    );
  }

  // Partida sem times
  if (!session.champion_name || !session.challenger_name) {
    return shell(
      <EmptyState
        icon="📋"
        title="Partida sem times"
        text="Os times ainda não foram definidos."
        action={isAdmin ? <Button variant="sun" onClick={() => router.push(`/g/${slug}/setup`)}>Configurar times</Button> : undefined}
      />,
    );
  }

  const [a, b] = countSets(sets);
  const champ = lineupNames(session.champion_name, session.champion_player_ids, playersMap);
  const chall = lineupNames(session.challenger_name, session.challenger_player_ids, playersMap);

  return shell(
    <>
      {isAdmin && (
        <div className="grid grid-cols-2 gap-2.5">
          <Button size="sm" onClick={() => setConfirm('swap')} disabled={busy}>Trocar Times</Button>
          <Button size="sm" variant="danger" onClick={() => setConfirm('end')} disabled={busy}>Encerrar</Button>
        </div>
      )}

      <Card>
        <span className="inline-flex items-center gap-1.5 font-extrabold text-xs tracking-[0.06em] text-danger">
          <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-danger" />
          AO VIVO
        </span>
        {session.description && (
          <span className="self-start font-extrabold text-[13px] bg-surface2 border-2 border-dashed border-soft rounded-[12px] px-2.5 py-0.5">
            {session.description}
          </span>
        )}
        <Scoreboard a={a} b={b} big />
      </Card>

      {isAdmin && (
        <Card>
          <Eyebrow>Quem ganhou o set?</Eyebrow>
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="sea" onClick={() => handleWin('champion')} disabled={busy} className="!py-6">Sem Colete</Button>
            <Button variant="vest" onClick={() => handleWin('challenger')} disabled={busy} className="!py-6">Com Colete</Button>
          </div>
          <Button variant="sun" onClick={handleUndo} disabled={busy || sets.length === 0}>↩ Desfazer último set</Button>
          <Sub>Só o vencedor do set entra aqui. Os pontos ficam na quadra.</Sub>
        </Card>
      )}

      <Card>
        <Eyebrow>Escalação</Eyebrow>
        <div className="grid grid-cols-2 gap-2.5">
          <Lineup side="champion" players={champ} />
          <Lineup side="challenger" players={chall} />
        </div>
      </Card>

      <ConfirmModal
        open={confirm === 'swap'}
        title="Trocar os times?"
        text="A partida atual termina com os sets já ganhos e você monta os times de novo."
        confirmLabel="Trocar times"
        busy={busy}
        onConfirm={handleSwap}
        onClose={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm === 'end'}
        danger
        title="Bora pro banho?"
        text="Isso encerra a partida e a rodada, e salva tudo no histórico."
        confirmLabel="Encerrar"
        busy={busy}
        onConfirm={handleEnd}
        onClose={() => setConfirm(null)}
      />
    </>,
  );
}
