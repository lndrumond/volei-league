'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch, getStoredRole } from '@/lib/avlClient';
import { CHAMPION_NAME, CHALLENGER_NAME, lineupNames, countSets } from '@/lib/teams';

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
        alert(data.error || failMsg);
        return false;
      }
      return true;
    } catch {
      alert(failMsg);
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
    if (await call('/api/sessions/swap', { session_id: session.id }, 'Não deu pra trocar os times.')) {
      router.push(`/g/${slug}/setup`);
    }
  };

  const handleEnd = async () => {
    if (!session) return;
    if (await call('/api/sessions/end', { session_id: session.id }, 'Erro ao fechar a quadra.')) router.push(`/g/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-100 flex items-center justify-center">
        <h2 className="text-green-800 font-black text-2xl animate-pulse">Limpando os óculos... 🕶️</h2>
      </div>
    );
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-green-100 p-4 pb-28 max-w-md mx-auto font-sans flex flex-col gap-4">
      {children}
    </div>
  );

  // Sem partida
  if (!session) {
    return shell(
      <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border-b-8 border-green-200 mt-6">
        <div className="text-6xl mb-2" aria-hidden="true">😴</div>
        <h1 className="text-2xl font-black text-green-800">Nenhuma partida no momento</h1>
        <p className="text-gray-500 font-bold mt-2">Quando o admin iniciar, o placar ao vivo aparece aqui.</p>
        {isAdmin && (
          <button onClick={() => router.push(`/g/${slug}/setup`)} className="mt-5 w-full bg-green-500 text-white text-xl font-black py-4 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all">
            Iniciar partida
          </button>
        )}
      </div>,
    );
  }

  // Partida sem times
  if (!session.champion_name || !session.challenger_name) {
    return shell(
      <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border-b-8 border-green-200 mt-6">
        <div className="text-6xl mb-2" aria-hidden="true">📋</div>
        <h1 className="text-2xl font-black text-green-800">Partida sem times</h1>
        <p className="text-gray-500 font-bold mt-2">Os times ainda não foram definidos.</p>
        {isAdmin && (
          <button onClick={() => router.push(`/g/${slug}/setup`)} className="mt-5 w-full bg-orange-500 text-white text-xl font-black py-4 rounded-2xl border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all">
            Configurar times
          </button>
        )}
      </div>,
    );
  }

  const [a, b] = countSets(sets);
  const champ = lineupNames(session.champion_name, session.champion_player_ids, playersMap);
  const chall = lineupNames(session.challenger_name, session.challenger_player_ids, playersMap);

  return shell(
    <>
      {isAdmin && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setConfirm('swap')} disabled={busy} className="bg-white text-blue-600 font-black py-3 rounded-2xl border-b-4 border-blue-200 active:translate-y-1 active:border-b-0 disabled:opacity-50">
            🔄 Trocar Times
          </button>
          <button onClick={() => setConfirm('end')} disabled={busy} className="bg-white text-red-600 font-black py-3 rounded-2xl border-b-4 border-red-200 active:translate-y-1 active:border-b-0 disabled:opacity-50">
            🛑 Encerrar
          </button>
        </div>
      )}

      <div className="bg-orange-500 rounded-[2rem] p-5 text-white shadow-lg border-b-8 border-orange-700 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <span className="font-black text-sm tracking-widest">AO VIVO</span>
        </div>
        {session.description && <div className="text-orange-100 font-bold text-sm">{session.description}</div>}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mt-2">
          <span className="font-black text-sm">{CHAMPION_NAME}</span>
          <span className="font-black text-6xl tabular-nums" aria-label={`${a} a ${b}`}>{a} x {b}</span>
          <span className="font-black text-sm">{CHALLENGER_NAME}</span>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border-b-8 border-green-200">
          <h2 className="font-black text-green-800 text-lg mb-3">Quem ganhou o set?</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleWin('champion')} disabled={busy} className="bg-green-500 text-white text-xl font-black py-8 rounded-2xl border-b-8 border-green-700 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-60">
              {CHAMPION_NAME}
            </button>
            <button onClick={() => handleWin('challenger')} disabled={busy} className="bg-orange-500 text-white text-xl font-black py-8 rounded-2xl border-b-8 border-orange-700 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-60">
              {CHALLENGER_NAME}
            </button>
          </div>
          <button onClick={handleUndo} disabled={busy || sets.length === 0} className="mt-3 w-full bg-yellow-300 text-yellow-900 font-black text-lg py-4 rounded-2xl border-b-4 border-yellow-500 active:border-b-0 active:translate-y-1 disabled:opacity-40">
            ↩ Desfazer último set
          </button>
          <p className="text-gray-500 font-bold text-sm mt-3">Só o vencedor do set entra aqui. Os pontos ficam na quadra.</p>
        </div>
      )}

      <div className="bg-white rounded-[2rem] p-5 shadow-sm border-b-8 border-green-200">
        <h2 className="font-black text-green-800 text-lg mb-3">Escalação</h2>
        <div className="grid grid-cols-2 gap-3">
          {[{ title: CHAMPION_NAME, list: champ, color: 'text-green-700' }, { title: CHALLENGER_NAME, list: chall, color: 'text-orange-600' }].map((t) => (
            <div key={t.title}>
              <h3 className={`font-black ${t.color} mb-1`}>{t.title}</h3>
              <ul className="font-bold text-gray-700 leading-snug">
                {t.list.map((p, i) => (
                  <li key={i}>{p.name}{p.captain && <span className="ml-1 text-[10px] font-black text-orange-500 uppercase">capitão</span>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm text-center">
            <div className="text-5xl mb-2" aria-hidden="true">{confirm === 'swap' ? '🔄' : '🚿'}</div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">{confirm === 'swap' ? 'Trocar os times?' : 'Bora pro banho?'}</h2>
            <p className="text-gray-500 font-bold mb-5">
              {confirm === 'swap'
                ? 'A partida atual termina com os sets já ganhos e você monta os times de novo.'
                : 'Isso encerra a partida e a rodada, e salva tudo no histórico.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { const c = confirm; setConfirm(null); if (c === 'swap') handleSwap(); else handleEnd(); }}
                className={`${confirm === 'swap' ? 'bg-blue-500 border-blue-700' : 'bg-red-500 border-red-700'} text-white text-xl font-black py-4 rounded-2xl border-b-8 active:border-b-0 active:translate-y-2 transition-all`}
              >
                {confirm === 'swap' ? 'Trocar times' : 'Encerrar'}
              </button>
              <button onClick={() => setConfirm(null)} className="bg-gray-100 text-gray-600 text-lg font-black py-3 rounded-2xl">Voltar</button>
            </div>
          </div>
        </div>
      )}
    </>,
  );
}
