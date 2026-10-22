'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/avlClient';
import { groupRanking, MEDALS } from '@/lib/ranking';

interface RankingItem { name: string; points: number; is_guest?: boolean; }

export default function RankingPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [filter, setFilter] = useState<'todos' | 'fixos'>('todos');

  useEffect(() => {
    setLoading(true);
    apiFetch(slug, `/api/rankings?slug=${slug}&period=${period}`)
      .then(res => res.json())
      .then(data => {
        setRankings(data.rankings || []);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [slug, period]);

  const filteredRankings = filter === 'fixos' 
    ? rankings.filter(r => !r.is_guest) 
    : rankings;

  return (
    <div className="h-screen bg-blue-50 flex flex-col p-4 pb-20 font-sans relative overflow-hidden">
      
      {/* HEADER FIXO NO TOPO */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <button onClick={() => router.push(`/g/${slug}`)} className="text-blue-800 font-black flex items-center gap-2 transition-colors hover:text-blue-600">
          <span>◀</span> Voltar pra quadra
        </button>
      </div>
      
      <div className="shrink-0">
        <h1 className="text-4xl font-black text-blue-900 mb-2 text-center leading-tight">
          Ranking<br/><span className="text-blue-500">dos Atletas</span> 🏆
        </h1>
        <p className="text-center text-blue-600 font-bold mb-4">Cada set ganho vale 1 ponto! Empatados dividem a posição.</p>

        <div className="flex bg-white rounded-[1.5rem] p-1 mb-2 border-4 border-blue-200 shadow-sm">
          <button 
            onClick={() => setPeriod('month')} 
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${period === 'month' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            🔥 Mês Atual
          </button>
          <button 
            onClick={() => setPeriod('all')} 
            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${period === 'all' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            🌟 Histórico Geral
          </button>
        </div>

        <div className="flex bg-white rounded-2xl p-1 mb-4 border-4 border-blue-200 shadow-sm">
          <button 
            onClick={() => setFilter('todos')} 
            className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${filter === 'todos' ? 'bg-blue-300 text-blue-900 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Todo Mundo
          </button>
          <button 
            onClick={() => setFilter('fixos')} 
            className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${filter === 'fixos' ? 'bg-blue-300 text-blue-900 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Só Fixos
          </button>
        </div>
      </div>

      {/* 🚨 AQUI ESTÁ O SEGREDO DO SCROLL: overflow-y-auto e flex-1 para preencher o resto da tela */}
      <div className="flex-1 overflow-y-auto pr-2 pb-4 scrollbar-thin">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="text-5xl animate-spin text-blue-500">🏐</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 relative z-10">
            {groupRanking(filteredRankings).map((g) => {
              const style =
                g.position === 1 ? { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-yellow-900', badge: 'bg-yellow-300 text-yellow-900' }
                : g.position === 2 ? { bg: 'bg-gray-300', border: 'border-gray-400', text: 'text-gray-800', badge: 'bg-gray-200 text-gray-800' }
                : g.position === 3 ? { bg: 'bg-orange-300', border: 'border-orange-400', text: 'text-orange-900', badge: 'bg-orange-200 text-orange-900' }
                : { bg: 'bg-white', border: 'border-blue-100', text: 'text-gray-800', badge: 'bg-blue-100 text-blue-800' };
              return (
                <div key={g.position} className={`${style.bg} border-b-4 ${style.border} p-4 rounded-[1.5rem] flex items-start justify-between gap-3 shadow-sm`}>
                  <span className={`font-black text-2xl w-10 text-center shrink-0 ${style.text}`} aria-label={`${g.position}º lugar`}>
                    {MEDALS[g.position] ?? `${g.position}º`}
                  </span>
                  <ul className="flex-1 min-w-0 flex flex-col gap-2">
                    {g.players.map((p, i) => (
                      <li key={`${p.name}-${i}`} className="min-h-8 flex items-center flex-wrap gap-2">
                        <span className={`font-black text-xl leading-none ${style.text}`}>{p.name}</span>
                        {p.is_guest && <span className="text-[10px] uppercase font-black tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">Visitante</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`${style.badge} px-4 py-2 rounded-xl font-black text-xl`}>{g.points}</span>
                    <span className={`font-bold text-xs ${style.text} opacity-70`}>pts</span>
                  </div>
                </div>
              );
            })}

            {filteredRankings.length === 0 && (
              <div className="bg-white rounded-[2rem] p-8 text-center border-4 border-dashed border-blue-200 shadow-sm mt-4">
                <div className="text-6xl mb-4">🌬️</div>
                <p className="text-blue-800 font-black text-xl">A quadra tá vazia!</p>
                <p className="text-blue-500 font-bold mt-2">Ninguém marcou ponto ainda. 🏐</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}