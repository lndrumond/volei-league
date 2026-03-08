'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/avlClient';

interface SetHistory {
  id: string;
  winner: string;
}

interface SessionHistory {
  id: string;
  created_at: string;
  ended_at: string;
  champion_name: string;
  challenger_name: string;
  champion_player_ids?: string[];
  challenger_player_ids?: string[];
  sets: SetHistory[];
}

export default function HistoryPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const playRes = await apiFetch(slug, `/api/players/list?slug=${slug}`).catch(() => null);
      if (playRes && playRes.ok) {
        const playData = await playRes.json();
        const pMap: Record<string, string> = {};
        playData.players?.forEach((p: { id: string; name: string }) => {
          // 🚨 AGORA PEGA O NOME COMPLETÃO SEM CORTAR 🚨
          pMap[p.id] = p.name.trim(); 
        });
        setPlayersMap(pMap);
      }

      let url = `/api/sessions/history?slug=${slug}`;
      if (startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      
      const res = await apiFetch(slug, url);
      if (res && res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoading(false);
    }
  }, [slug, startDate, endDate]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getTeamNamesArray = (ids?: string[]) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => playersMap[id] || 'Misterioso');
  };

  const formatMatchDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR', { 
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    }).replace(',', ' às');
  };

  const applyQuickFilter = (type: 'hoje' | 'ontem' | 'semana') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'hoje') {
      // Hoje
    } else if (type === 'ontem') {
      start.setDate(today.getDate() - 1);
      end.setDate(today.getDate() - 1);
    } else if (type === 'semana') {
      start.setDate(today.getDate() - 7);
    }

    const tzOffset = start.getTimezoneOffset() * 60000;
    const startStr = new Date(start.getTime() - tzOffset).toISOString().split('T')[0];
    const endStr = new Date(end.getTime() - tzOffset).toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);
    setShowCustomDates(false);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setShowCustomDates(false);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-green-100 p-4 pb-20 max-w-md mx-auto relative font-sans">
      
      {/* 🚨 ÁREA FIXA NO TOPO (STICKY) 🚨 
          Isso faz com que o menu e o filtro não sumam quando você rola a tela pra baixo */}
      <div className="sticky top-0 z-50 bg-green-100/95 backdrop-blur-sm pt-2 pb-2 -mx-2 px-2 border-b-2 border-green-200/50 shadow-sm mb-4">
        
        {/* CABEÇALHO DIVERTIDO (MAIS COMPACTO) */}
        <header className="flex justify-between items-center mb-3 bg-white p-3 rounded-2xl shadow-sm border-b-4 border-green-200">
          <button 
            onClick={() => router.push(`/g/${slug}`)} 
            className="bg-red-100 text-red-600 font-black px-3 py-1.5 rounded-xl text-xs border-b-4 border-red-200 active:translate-y-1 transition-all flex items-center gap-1"
          >
            <span>⬅️</span> Voltar
          </button>
          <div className="flex flex-col transform -rotate-2 text-right flex-1 ml-2">
              <span className="font-black text-xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-500 drop-shadow-[1px_1px_0_rgba(0,0,0,0.8)] leading-none mb-0.5">
                BAÚ DE
              </span>
              <span className="font-black text-lg tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-500 to-gray-700 drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)] leading-none">
                RESENHAS 📜
              </span>
          </div>
        </header>

        {/* MÁQUINA DO TEMPO (MAIS COMPACTA) */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border-b-4 border-orange-200 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute -right-2 -top-2 text-5xl opacity-5 pointer-events-none rotate-12">⏱️</div>
          
          <div className="flex justify-between items-center relative z-10">
            <h3 className="font-black text-orange-600 text-[13px] flex items-center gap-1">
              🛸 Máquina do Tempo
            </h3>
            {(startDate || endDate) && (
              <button onClick={clearFilters} className="text-[9px] bg-red-500 text-white px-2 py-1 rounded-md font-black uppercase tracking-widest active:scale-95 transition-transform shadow-sm">
                Limpar ❌
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-4 gap-1.5 relative z-10">
            <button onClick={() => applyQuickFilter('hoje')} className="bg-orange-100 text-orange-700 font-black py-2 rounded-lg text-[10px] border-b-[3px] border-orange-200 active:border-b-0 active:translate-y-px transition-all">
              HOJE
            </button>
            <button onClick={() => applyQuickFilter('ontem')} className="bg-orange-100 text-orange-700 font-black py-2 rounded-lg text-[10px] border-b-[3px] border-orange-200 active:border-b-0 active:translate-y-px transition-all">
              ONTEM
            </button>
            <button onClick={() => applyQuickFilter('semana')} className="bg-orange-100 text-orange-700 font-black py-2 rounded-lg text-[10px] border-b-[3px] border-orange-200 active:border-b-0 active:translate-y-px transition-all">
              7 DIAS
            </button>
            <button onClick={() => setShowCustomDates(!showCustomDates)} className={`font-black py-2 rounded-lg text-[10px] border-b-[3px] active:border-b-0 active:translate-y-px transition-all ${showCustomDates ? 'bg-orange-500 text-white border-orange-700' : 'bg-white text-orange-500 border-orange-200 border-[1.5px]'}`}>
              DATA 🗓️
            </button>
          </div>

          {showCustomDates && (
            <div className="flex gap-1.5 items-center mt-1 animate-fade-in p-2 bg-orange-50 rounded-lg border border-dashed border-orange-200">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 bg-white rounded-md p-1.5 text-[11px] text-orange-900 outline-none border border-orange-200 font-bold shadow-sm" />
              <span className="text-orange-400 font-black text-[10px]">até</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 bg-white rounded-md p-1.5 text-[11px] text-orange-900 outline-none border border-orange-200 font-bold shadow-sm" />
            </div>
          )}
        </div>
      </div>
      {/* 🚨 FIM DA ÁREA FIXA 🚨 */}

      <div className="mb-3 flex flex-col items-center">
        <h2 className="text-lg font-black text-green-900 mb-0.5 uppercase drop-shadow-sm">Fita Cassete</h2>
        <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest bg-green-200 px-2.5 py-0.5 rounded-full shadow-sm">
          {(startDate || endDate) ? 'Resultados Filtrados' : 'Últimos 10 amassos'}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-3xl p-6 text-center border-b-4 border-gray-200 shadow-sm mt-4">
          <span className="text-5xl mb-3 block">🏜️</span>
          <h3 className="font-black text-gray-700 text-lg">Areia lisa!</h3>
          <p className="text-gray-500 font-bold mt-1 text-xs">Ninguém deitou em ninguém nesse período.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((session) => {
            let champScore = 0;
            let challScore = 0;
            
            session.sets?.forEach(s => {
              if (s.winner === 'champion' || s.winner === session.champion_name) champScore++;
              else if (s.winner === 'challenger' || s.winner === session.challenger_name) challScore++;
            });

            const winner = champScore > challScore ? 'champion' : (challScore > champScore ? 'challenger' : 'draw');

            return (
              // 🚨 CARDS MAIS COMPACTOS E OTIMIZADOS 🚨
              <div key={session.id} className="bg-white rounded-[1.5rem] p-3 shadow-md border-b-4 border-gray-200 relative overflow-hidden">
                <div className="flex justify-between items-center mb-2.5 border-b border-dashed border-gray-100 pb-2">
                  <span className="text-[9px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                    {formatMatchDate(session.ended_at || session.created_at)}
                  </span>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <span>🏁</span>
                  </span>
                </div>

                <div className="flex justify-between items-stretch text-center gap-1.5">
                  <div className={`flex-1 p-2 rounded-xl border-2 flex flex-col ${winner === 'champion' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 opacity-80'}`}>
                    <div className="flex flex-col items-center mb-1.5 pb-1 border-b border-gray-200/50">
                      {winner === 'champion' && <span className="text-sm mb-0.5 drop-shadow-sm">👑</span>}
                      <h3 className={`font-black text-xs leading-tight uppercase ${winner === 'champion' ? 'text-green-700' : 'text-gray-500'}`}>
                        {session.champion_name}
                      </h3>
                    </div>
                    {/* 🚨 NOMES COMPLETOS: Letra um pouco menor, quebra de linha ativada 🚨 */}
                    <div className="flex flex-col gap-0.5 flex-1 justify-center">
                      {getTeamNamesArray(session.champion_player_ids).map((name, idx) => (
                        <span key={idx} className="text-[9px] text-gray-700 font-bold leading-none my-0.5 break-words">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-800 text-white font-black text-xl px-2.5 py-1.5 rounded-xl shadow-md border-b-2 border-black flex items-center gap-1.5">
                      <span className={winner === 'champion' ? 'text-yellow-400' : ''}>{champScore}</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">x</span>
                      <span className={winner === 'challenger' ? 'text-yellow-400' : ''}>{challScore}</span>
                    </div>
                  </div>

                  <div className={`flex-1 p-2 rounded-xl border-2 flex flex-col ${winner === 'challenger' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100 opacity-80'}`}>
                    <div className="flex flex-col items-center mb-1.5 pb-1 border-b border-gray-200/50">
                      {winner === 'challenger' && <span className="text-sm mb-0.5 drop-shadow-sm">👑</span>}
                      <h3 className={`font-black text-xs leading-tight uppercase ${winner === 'challenger' ? 'text-orange-600' : 'text-gray-500'}`}>
                        {session.challenger_name}
                      </h3>
                    </div>
                    {/* 🚨 NOMES COMPLETOS: Letra um pouco menor, quebra de linha ativada 🚨 */}
                    <div className="flex flex-col gap-0.5 flex-1 justify-center">
                      {getTeamNamesArray(session.challenger_player_ids).map((name, idx) => (
                        <span key={idx} className="text-[9px] text-gray-700 font-bold leading-none my-0.5 break-words">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-green-400 flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl animate-bounce mb-4 drop-shadow-lg">🏐</div>
        <h2 className="text-white font-black text-xl tracking-widest uppercase drop-shadow-md">Rebobinando a fita...</h2>
      </div>
    </div>
  );
}