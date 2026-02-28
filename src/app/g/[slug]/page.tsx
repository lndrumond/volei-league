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
      const [sessRes, rankRes] = await Promise.all([
        apiFetch(slug, `/api/sessions/active?slug=${slug}`),
        apiFetch(slug, `/api/rankings/month?slug=${slug}`).catch(() => null) 
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

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Botão para deslogar e testar o PIN de novo
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
        <h1 className="text-3xl font-black text-green-800 flex items-center gap-3">
          <span className="text-4xl">🦖</span>
          <span className="uppercase text-orange-500 tracking-tight">{slug.replace(/-/g, ' ')}</span>
        </h1>
        {role !== 'viewer' && (
          <button onClick={handleLogout} className="bg-red-100 text-red-600 font-black px-4 py-2 rounded-xl text-sm border-b-4 border-red-200 active:translate-y-1">
            Sair
          </button>
        )}
      </header>

      <div className={`p-6 rounded-[2rem] shadow-lg border-b-8 mb-6 transition-colors ${hasSession ? 'bg-orange-500 border-orange-700' : 'bg-white border-green-300'}`}>
        <h2 className={`text-2xl font-black mb-5 flex items-center gap-2 ${hasSession ? 'text-white' : 'text-green-800'}`}>
          {hasSession ? '🔥 A areia tá voando!' : '💤 Quadra livre...'}
        </h2>
        
        {!hasSession && (
          <button onClick={() => handleProtectedAction('admin', `/g/${slug}/admin`)} className="w-full bg-green-500 text-white text-2xl font-black py-5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all">
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
        <div className="absolute -right-4 -bottom-4 text-7xl opacity-5 pointer-events-none">🥚</div>
        <h3 className="text-xl font-black text-green-800 mb-4 flex justify-between items-center relative z-10">
          <span>🏆 Top 5 do Mês</span>
          <button onClick={() => router.push(`/g/${slug}/ranking`)} className="text-sm font-bold text-blue-500 hover:text-blue-700">Ver tudo</button>
        </h3>
        <div className="flex flex-col gap-3 relative z-10">
          {rankings.slice(0, 5).map((r, i) => (
            <div key={i} className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100">
              <span className="font-black text-green-900 text-lg">#{i+1} {r.name}</span>
              <span className="bg-green-200 text-green-800 px-3 py-1 rounded-xl font-black">{r.points} pts</span>
            </div>
          ))}
          {rankings.length === 0 && (
            <div className="bg-gray-50 rounded-2xl p-6 text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">Nenhum ovo chocado esse mês. 🥚</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => router.push(`/g/${slug}/history`)} className="w-full bg-white text-gray-500 font-black py-4 rounded-2xl border-b-4 border-gray-200 active:translate-y-1 transition-transform">
        VER HISTÓRICO 📜
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
        <div className="text-7xl animate-bounce mb-4 drop-shadow-lg">🥚</div>
        <h2 className="text-white font-black text-2xl tracking-widest">Penteando a areia...</h2>
      </div>
    </div>
  );
}