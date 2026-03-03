'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/avlClient';

interface RankingItem { name: string; points: number; is_guest?: boolean; }

export default function RankingPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Controles de Visualização
  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [filter, setFilter] = useState<'todos' | 'fixos'>('todos');

  // Sempre que mudar o período (Mês ou Geral), a API puxa o cálculo atualizado
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
    <div className="min-h-screen bg-blue-50 p-4 pb-20 max-w-md mx-auto font-sans relative">
      
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.push(`/g/${slug}`)} className="text-blue-800 font-black flex items-center gap-2 transition-colors hover:text-blue-600">
          <span>◀</span> Voltar pra quadra
        </button>
      </div>
      
      <h1 className="text-4xl font-black text-blue-900 mb-2 text-center leading-tight">
        Ranking<br/><span className="text-blue-500">dos Atletas</span> 🏆
      </h1>
      <p className="text-center text-blue-600 font-bold mb-6">Cada set ganho vale 1 ponto!</p>

      {/* FILTRO 1: PERÍODO (MÊS vs GERAL) */}
      <div className="flex bg-white rounded-[1.5rem] p-1 mb-3 border-4 border-blue-200 shadow-sm">
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

      {/* FILTRO 2: TIPO DE JOGADOR (TODOS vs FIXOS) */}
      <div className="flex bg-white rounded-2xl p-1 mb-6 border-4 border-blue-200 shadow-sm">
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

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="text-5xl animate-spin text-blue-500">🏐</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 relative z-10">
          {filteredRankings.map((r, i) => {
            const isFirst = i === 0;
            const isSecond = i === 1;
            const isThird = i === 2;
            
            let bgColor = 'bg-white';
            let borderColor = 'border-blue-100';
            let textColor = 'text-gray-800';
            let badgeColor = 'bg-blue-100 text-blue-800';
            
            if (isFirst) {
              bgColor = 'bg-yellow-400'; borderColor = 'border-yellow-500'; textColor = 'text-yellow-900'; badgeColor = 'bg-yellow-300 text-yellow-900';
            } else if (isSecond) {
              bgColor = 'bg-gray-300'; borderColor = 'border-gray-400'; textColor = 'text-gray-800'; badgeColor = 'bg-gray-200 text-gray-800';
            } else if (isThird) {
              bgColor = 'bg-orange-300'; borderColor = 'border-orange-400'; textColor = 'text-orange-900'; badgeColor = 'bg-orange-200 text-orange-900';
            }

            return (
              <div key={i} className={`${bgColor} border-b-4 ${borderColor} p-4 rounded-[1.5rem] flex justify-between items-center shadow-sm hover:scale-[1.02] transition-transform`}>
                <div className="flex items-center gap-3">
                  <span className={`font-black text-2xl w-8 text-center ${textColor}`}>
                    {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `${i+1}º`}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-black text-xl ${textColor} leading-none`}>{r.name}</span>
                    {r.is_guest && <span className="text-[10px] uppercase font-black tracking-widest text-blue-500 mt-1 bg-blue-50 w-max px-2 py-0.5 rounded-md">Visitante</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <span className={`${badgeColor} px-4 py-2 rounded-xl font-black text-xl`}>
                    {r.points}
                  </span>
                  <span className={`font-bold text-xs ${textColor} opacity-70`}>pts</span>
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
  );
}