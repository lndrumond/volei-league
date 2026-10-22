'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, PinModal, useAVLAuth, clearAuth } from '@/lib/avlClient';
import { CHAMPION_NAME, CHALLENGER_NAME, lineupNames, countSets } from '@/lib/teams';
import { MEDALS, top5 } from '@/lib/ranking';

interface RankingItem { name: string; points: number; is_guest?: boolean; }
interface SessionRow {
  id: string;
  champion_name?: string | null;
  challenger_name?: string | null;
  champion_player_ids?: string[];
  challenger_player_ids?: string[];
  created_at?: string;
  ended_at?: string | null;
}

export default function Dashboard() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const { role, refreshAuth } = useAVLAuth(slug);

  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [lastEndedSession, setLastEndedSession] = useState<SessionRow | null>(null);
  const [sessionSets, setSessionSets] = useState<{ winner: string }[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [pinOpen, setPinOpen] = useState(false);
  const [afterPin, setAfterPin] = useState<() => void>(() => () => {});

  const isAdmin = role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const [sessRes, rankRes, playRes] = await Promise.all([
        apiFetch(slug, `/api/sessions/active?slug=${slug}`),
        apiFetch(slug, `/api/rankings?slug=${slug}&period=month`).catch(() => null),
        apiFetch(slug, `/api/players/list?slug=${slug}`).catch(() => null),
      ]);

      if (playRes && playRes.ok) {
        const playData = await playRes.json();
        const pMap: Record<string, string> = {};
        playData.players?.forEach((p: { id: string; name: string }) => { pMap[p.id] = p.name; });
        setPlayersMap(pMap);
      }
      if (sessRes && sessRes.ok) {
        const sessData = await sessRes.json();
        setActiveSession(sessData.activeSession || null);
        setLastEndedSession(sessData.lastEndedSession || null);
        setSessionSets(sessData.sets || []);
      }
      if (rankRes && rankRes.ok) {
        const rankData = await rankRes.json();
        setRankings(rankData.rankings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  // Ações do admin: sem PIN abre a janela do PIN e depois segue para a rota.
  const adminGo = (route: string) => {
    if (isAdmin) return router.push(route);
    setAfterPin(() => () => router.push(route));
    setPinOpen(true);
  };

  const handleLogout = () => {
    clearAuth(slug);
    refreshAuth();
    alert('Você saiu da quadra. PIN resetado!');
  };

  const formatWhen = (start?: string, end?: string | null) => {
    if (!start) return '';
    const tz = 'America/Sao_Paulo';
    const s = new Date(start);
    const day = s.toLocaleDateString('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' });
    const hour = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    return end ? `${day} · ${hour(s)} às ${hour(new Date(end))}` : `${day} · ${hour(s)}`;
  };

  if (loadingData) return <LoadingScreen />;

  const hasSession = Boolean(activeSession);
  const hasTeams = Boolean(activeSession?.champion_name && activeSession?.challenger_name);
  const [liveA, liveB] = countSets(sessionSets);
  const lastShown = !activeSession && lastEndedSession?.champion_name ? lastEndedSession : null;

  return (
    <div className="min-h-screen bg-green-100 p-4 pb-28 max-w-md mx-auto relative font-sans">
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-[2rem] shadow-sm border-b-8 border-green-200">
        <div className="flex items-center gap-3 flex-1">
          <img src="/logo.png" alt="Mascote" className="h-16 object-contain drop-shadow-md" />
          <div className="flex flex-col transform -rotate-2">
            <span className="font-black text-3xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-700 drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)] leading-none mb-1">
              AMIGOS
            </span>
            <span className="font-black text-2xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-500 drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)] leading-none ml-2">
              DO VÔLEI
            </span>
          </div>
        </div>
        {isAdmin && (
          <button onClick={handleLogout} className="bg-red-100 text-red-600 font-black px-4 py-2 rounded-xl text-sm border-b-4 border-red-200 active:translate-y-1 ml-4 transition-all">
            Sair
          </button>
        )}
      </header>

      {/* Estado da quadra */}
      <div className={`p-6 rounded-[2rem] shadow-lg border-b-8 mb-5 ${hasSession ? 'bg-orange-500 border-orange-700' : 'bg-white border-green-300'}`}>
        {!hasSession && (
          <>
            <h2 className="text-2xl font-black mb-1 text-green-800">Quadra livre 😴</h2>
            {isAdmin ? (
              <button onClick={() => adminGo(`/g/${slug}/setup`)} className="mt-4 w-full bg-green-500 text-white text-2xl font-black py-5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-sm">
                INICIAR RODADA 🏐
              </button>
            ) : (
              <>
                <p className="text-gray-500 font-bold">Aguardando o admin iniciar a rodada.</p>
                <button onClick={() => adminGo(`/g/${slug}/setup`)} className="mt-4 w-full bg-green-500 text-white text-xl font-black py-4 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-sm">
                  Sou admin: iniciar rodada
                </button>
              </>
            )}
          </>
        )}

        {hasSession && !hasTeams && (
          <>
            <h2 className="text-2xl font-black mb-1 text-white">Rodada rolando</h2>
            <p className="text-orange-50 font-bold">Os times ainda não foram definidos.</p>
            {isAdmin && (
              <button onClick={() => router.push(`/g/${slug}/setup`)} className="mt-4 w-full bg-white text-orange-600 text-xl font-black py-5 rounded-2xl border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition-all shadow-sm">
                CONFIGURAR TIMES 🤼
              </button>
            )}
          </>
        )}

        {hasSession && hasTeams && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
              </span>
              <span className="text-white font-black text-sm tracking-widest">AO VIVO</span>
              <span className="text-orange-100 font-bold text-xs ml-auto">{formatWhen(activeSession?.created_at)}</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center text-center text-white gap-2">
              <span className="font-black text-sm">{CHAMPION_NAME}</span>
              <span className="font-black text-5xl tabular-nums">{liveA} x {liveB}</span>
              <span className="font-black text-sm">{CHALLENGER_NAME}</span>
            </div>
            <button onClick={() => router.push(`/g/${slug}/game`)} className="mt-4 w-full bg-green-400 text-green-900 text-2xl font-black py-4 rounded-2xl border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all shadow-sm">
              ABRIR PLACAR 🎮
            </button>
          </>
        )}
      </div>

      {/* Último confronto */}
      {lastShown && (() => {
        const [a, b] = countSets(sessionSets);
        const champ = lineupNames(lastShown.champion_name, lastShown.champion_player_ids, playersMap);
        const chall = lineupNames(lastShown.challenger_name, lastShown.challenger_player_ids, playersMap);
        return (
          <div className="bg-white rounded-[1.5rem] p-4 shadow-md border-b-4 border-sky-200 mb-5">
            <div className="flex justify-between items-center mb-3 border-b border-sky-50 pb-2">
              <span className="text-sky-600 font-black text-xs tracking-widest uppercase">🏖️ Último confronto</span>
              <span className="text-xs text-gray-400 font-bold">{formatWhen(lastShown.created_at, lastShown.ended_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { title: CHAMPION_NAME, n: a, win: a > b, list: champ, color: 'text-green-700' },
                { title: CHALLENGER_NAME, n: b, win: b > a, list: chall, color: 'text-orange-600' },
              ].map((t) => (
                <div key={t.title} className={`rounded-2xl border-2 p-2 text-center ${t.win ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-gray-50'}`}>
                  <div className={`font-black text-sm ${t.color}`}>{t.title}</div>
                  <div className="font-black text-4xl text-gray-800 tabular-nums" aria-label={`${t.n} sets`}>{t.n}</div>
                  <ul className="text-sm font-bold text-gray-600 leading-snug">
                    {t.list.map((p, i) => (
                      <li key={i}>{p.name}{p.captain && <span className="ml-1 text-[10px] font-black text-orange-500 uppercase">cap.</span>}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Top 5 do mês: posições 1 a 5, empatados juntos e um embaixo do outro */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border-b-8 border-green-200 mb-6 relative overflow-hidden">
        <h3 className="text-xl font-black text-green-800 mb-4">🏆 Top 5 do Mês</h3>
        <div className="flex flex-col gap-3">
          {top5(rankings).map((g) => (
            <div
              key={g.position}
              className={`flex items-start gap-3 p-3 rounded-2xl border-2 ${
                g.position === 1 ? 'bg-yellow-100 border-yellow-300' : g.position === 2 ? 'bg-gray-100 border-gray-300' : g.position === 3 ? 'bg-orange-100 border-orange-300' : 'bg-green-50 border-green-100'
              }`}
            >
              <span className="w-10 text-center font-black text-2xl text-green-900" aria-label={`${g.position}º lugar`}>
                {MEDALS[g.position] ?? `${g.position}º`}
              </span>
              <ul className="flex-1 min-w-0 font-black text-green-900 text-lg leading-snug">
                {g.shown.map((p, i) => (
                  <li key={`${p.name}-${i}`}>
                    {p.name}
                    {p.is_guest && <small className="ml-2 text-xs font-bold text-gray-500">visitante</small>}
                  </li>
                ))}
                {g.more > 0 && <li className="text-sm font-bold text-gray-500">+{g.more} no mesmo placar</li>}
              </ul>
              <span className="bg-white/70 text-green-900 px-3 py-1 rounded-xl font-black">{g.points} pts</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">Nenhum ponto marcado esse mês. 🏐</p>
            </div>
          )}
        </div>
        <button onClick={() => router.push(`/g/${slug}/ranking`)} className="mt-4 w-full text-blue-600 font-black text-base py-2">
          Ver ranking completo →
        </button>
      </div>

      {pinOpen && (
        <PinModal
          slug={slug}
          requiredRole="admin"
          onSuccess={() => {
            refreshAuth();
            setPinOpen(false);
            afterPin();
          }}
          onClose={() => setPinOpen(false)}
        />
      )}

    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-green-400 flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl animate-bounce mb-4 drop-shadow-lg">🏐</div>
        <h2 className="text-white font-black text-2xl tracking-widest">Penteando a areia...</h2>
      </div>
    </div>
  );
}
