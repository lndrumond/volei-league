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
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, requiredRole: Role, action: () => void }>({
    isOpen: false, requiredRole: 'admin', action: () => {}
  });

  const loadData = useCallback(async () => {
    try {
      // Puxa o Top 5 focando apenas no MÊS ATUAL (period=month)
      const [sessRes, rankRes] = await Promise.all([
        apiFetch(slug, `/api/sessions/active?slug=${slug}`),
        apiFetch(slug, `/api/rankings?slug=${slug}&period=month`).catch(() => null) 
      ]);
      
      if (sessRes && sessRes.ok) {
        const sessData = await sessRes.json();
        if (sessData.session && sessData.session.id) {
          setSession(sessData.session);
        } else {
          setSession(null);
        }
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

      <div className={`p-6 rounded-[2rem] shadow-lg border-b-8 mb-6 transition-colors ${hasSession ? 'bg-orange-500 border-orange-700' : 'bg-white border-green-300'}`}>
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