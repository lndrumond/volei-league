'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, PinModal, useAVLAuth, Role, SessionData, clearAuth } from '@/lib/avlClient';

interface RankingItem { name: string; points: number; }

export default function Dashboard() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const { role, refreshAuth } = useAVLAuth(slug);
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [lastEndedSession, setLastEndedSession] = useState<any | null>(null);
  // 🚨 Estado para guardar o placar (sets) 🚨
  const [sessionSets, setSessionSets] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, requiredRole: Role, action: () => void }>({
    isOpen: false, requiredRole: 'admin', action: () => {}
  });

  const loadData = useCallback(async () => {
    try {
      const [sessRes, rankRes, playRes] = await Promise.all([
        apiFetch(slug, `/api/sessions/active?slug=${slug}`),
        apiFetch(slug, `/api/rankings?slug=${slug}&period=month`).catch(() => null),
        apiFetch(slug, `/api/players/list?slug=${slug}`).catch(() => null)
      ]);
      
      if (playRes && playRes.ok) {
        const playData = await playRes.json();
        const pMap: Record<string, string> = {};
        playData.players?.forEach((p: { id: string; name: string }) => {
          pMap[p.id] = p.name;
        });
        setPlayersMap(pMap);
      }

      if (sessRes && sessRes.ok) {
        const sessData = await sessRes.json();
        
        if (sessData.session && sessData.session.id) {
          setSession(sessData.session);
        } else {
          setSession(null);
        }

        setActiveSession(sessData.activeSession || null);
        setLastEndedSession(sessData.lastEndedSession || null);
        setSessionSets(sessData.sets || []); // Salva os sets para calcularmos o placar
      }
      
      if (rankRes && rankRes.ok) {
        const rankData = await rankRes.json();
        setRankings(rankData.rankings || []);
      }
    } catch (e) {
      console.error(e);
      setSession(null);
    } finally {
      setLoadingData(false);
    }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleProtectedAction = (requiredRole: Role, route: string) => {
    const roleHierarchy = { admin: 3, writer: 2, viewer: 1 };
    const userLevel = roleHierarchy[role] || 1;
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel >= requiredLevel) {
      router.push(route);
    } else {
      setModalConfig({ isOpen: true, requiredRole, action: () => router.push(route) });
    }
  };

  const handleLogout = () => {
    clearAuth(slug);
    refreshAuth();
    alert('Você saiu da quadra. PIN resetado!');
  };

  const getTeamNamesArray = (ids?: string[]) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => playersMap[id] || 'Jogador Misterioso');
  };

  const formatMatchDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    }).replace(',', ' às');
  };

// 🚨 Cálculo Dinâmico do Placar (Lendo a coluna 'winner') 🚨
  let champScore = 0;
  let challScore = 0;
  const currentSession = activeSession || lastEndedSession;

  sessionSets.forEach(s => {
    // Verifica se o winner foi salvo como 'champion', ou com o nome exato do time
    if (s.winner === 'champion' || s.winner === currentSession?.champion_name) {
      champScore++;
    } else if (s.winner === 'challenger' || s.winner === currentSession?.challenger_name) {
      challScore++;
    }
  });

  if (loadingData) return <LoadingScreen />;

  const hasSession = Boolean(session && session.id);
  const hasTeams = Boolean(session?.champion_name && session?.challenger_name);

  return (
    <div className="min-h-screen bg-green-100 p-4 pb-20 max-w-md mx-auto relative font-sans">
      
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
        {role !== 'viewer' && (
          <button onClick={handleLogout} className="bg-red-100 text-red-600 font-black px-4 py-2 rounded-xl text-sm border-b-4 border-red-200 active:translate-y-1 ml-4 transition-all">
            Sair
          </button>
        )}
      </header>

      <div className={`p-6 rounded-[2rem] shadow-lg border-b-8 mb-5 transition-colors ${hasSession ? 'bg-orange-500 border-orange-700' : 'bg-white border-green-300'}`}>
        <h2 className={`text-2xl font-black mb-5 flex items-center gap-2 ${hasSession ? 'text-white' : 'text-green-800'}`}>
          {hasSession ? '🔥 A areia tá voando!' : '💤 Quadra livre...'}
        </h2>
        
        {!hasSession && (
          <button onClick={() => handleProtectedAction('admin', `/g/${slug}/admin`)} className="w-full bg-green-500 text-white text-2xl font-black py-5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all shadow-sm">
            INICIAR RODADA 🏐
          </button>
        )}

        {hasSession && !hasTeams && (
          <button onClick={() => handleProtectedAction('admin', `/g/${slug}/setup`)} className="w-full bg-white text-orange-600 text-xl font-black py-5 rounded-2xl border-b-4 border-gray-200 active:border-b-0 active:translate-y-1 transition-all shadow-sm">
            CONFIGURAR TIMES 🤼
          </button>
        )}

        {hasSession && hasTeams && (
          <button onClick={() => handleProtectedAction('writer', `/g/${slug}/game`)} className="w-full bg-green-400 text-green-900 text-2xl font-black py-5 rounded-2xl border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all animate-pulse shadow-sm">
            ABRIR PLACAR 🎮
          </button>
        )}
      </div>

      {/* ========================================= */}
      {/* 🚨 CARDS MAIS COMPACTOS E DIRETOS 🚨 */}
      {/* ========================================= */}
      
      {/* CARD 1: AO VIVO */}
      {(activeSession && activeSession.champion_name) && (
        <div 
          onClick={() => handleProtectedAction('viewer', `/g/${slug}/game`)}
          className="bg-white rounded-[1.5rem] p-4 shadow-md border-b-4 border-red-300 mb-5 relative cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex justify-between items-center mb-3 border-b border-red-50 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-red-600 font-black text-[11px] tracking-widest uppercase">AO VIVO</span>
            </div>
            {/* Placar parcial */}
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 rounded-md">
               Sets: {champScore} - {challScore}
            </div>
          </div>

          <div className="flex justify-between items-start text-center gap-2">
            <div className="flex-1">
              <h3 className="font-black text-green-700 text-sm leading-tight uppercase mb-1">{activeSession.champion_name}</h3>
              <div className="flex flex-col">
                {getTeamNamesArray(activeSession.champion_player_ids).map((name, idx) => (
                  <span key={idx} className="text-[10px] text-gray-500 font-bold leading-tight">{name}</span>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col items-center pt-2">
              <span className="text-sm font-black text-gray-300">VS</span>
            </div>

            <div className="flex-1">
              <h3 className="font-black text-orange-600 text-sm leading-tight uppercase mb-1">{activeSession.challenger_name}</h3>
              <div className="flex flex-col">
                {getTeamNamesArray(activeSession.challenger_player_ids).map((name, idx) => (
                  <span key={idx} className="text-[10px] text-gray-500 font-bold leading-tight">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARD 2: ÚLTIMO CONFRONTO (MAIS COMPACTO, COM PLACAR DE SETS) */}
      {(!activeSession && lastEndedSession && lastEndedSession.champion_name) && (
        <div className="bg-white rounded-[1.5rem] p-4 shadow-md border-b-4 border-sky-200 mb-5 relative">
          
          <div className="flex justify-between items-center mb-3 border-b border-sky-50 pb-2">
            <span className="text-sky-600 font-black text-[11px] tracking-widest uppercase">ÚLTIMO CONFRONTO</span>
            {lastEndedSession.created_at && (
              <span className="text-[10px] text-gray-400 font-bold tracking-wide">
                {formatMatchDate(lastEndedSession.created_at)}
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-center gap-1">
            {/* TIME A */}
            <div className="flex-1">
              <h3 className="font-black text-green-700 text-sm leading-tight uppercase">{lastEndedSession.champion_name}</h3>
              <div className="flex flex-col mt-1">
                {getTeamNamesArray(lastEndedSession.champion_player_ids).map((name, idx) => (
                  <span key={idx} className="text-[10px] text-gray-500 font-bold leading-tight">{name}</span>
                ))}
              </div>
            </div>
            
            {/* PLACAR DE SETS CENTRALIZADO */}
            <div className="flex flex-col items-center px-2">
              <div className="bg-sky-50 text-sky-800 font-black text-xl px-3 py-1 rounded-xl shadow-sm border border-sky-100 flex items-center gap-1">
                <span>{champScore}</span>
                <span className="text-[11px] text-sky-400 uppercase tracking-widest px-1">x</span>
                <span>{challScore}</span>
              </div>
              <span className="text-[9px] text-sky-500 font-bold uppercase mt-1 tracking-widest">Sets</span>
            </div>

            {/* TIME B */}
            <div className="flex-1">
              <h3 className="font-black text-orange-600 text-sm leading-tight uppercase">{lastEndedSession.challenger_name}</h3>
              <div className="flex flex-col mt-1">
                {getTeamNamesArray(lastEndedSession.challenger_player_ids).map((name, idx) => (
                  <span key={idx} className="text-[10px] text-gray-500 font-bold leading-tight">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================= */}

      <div className="bg-white rounded-[2rem] p-5 shadow-sm border-b-8 border-green-200 mb-6 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 pointer-events-none">🏐</div>
        <h3 className="text-xl font-black text-green-800 mb-4 flex justify-between items-center relative z-10">
          <span>🏆 Top 5 do Mês</span>
        </h3>
        <div className="flex flex-col gap-3 relative z-10">
          {rankings.slice(0, 5).map((r, i) => (
            <div key={i} className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100">
              <span className="font-black text-green-900 text-lg">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`} {r.name}
              </span>
              <span className="bg-green-200 text-green-800 px-3 py-1 rounded-xl font-black">{r.points} pts</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">Nenhum ponto marcado esse mês. 🏐</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => router.push(`/g/${slug}/ranking`)} className="w-full bg-blue-500 text-white font-black text-xl py-5 rounded-[2rem] border-b-8 border-blue-700 active:translate-y-2 active:border-b-0 transition-all shadow-md flex justify-center items-center gap-2">
        VER RANKING COMPLETO 🏆
      </button>

      {modalConfig.isOpen && (
        <PinModal
          slug={slug}
          requiredRole={modalConfig.requiredRole}
          onSuccess={() => {
            refreshAuth();
            setModalConfig({ ...modalConfig, isOpen: false });
            modalConfig.action();
          }}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
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