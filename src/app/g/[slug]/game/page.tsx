'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, getStoredRole } from '@/lib/avlClient';

export default function Game() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [sets, setSets] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // CORREÇÃO DA EXPULSÃO INSTANTÂNEA: Lê a permissão direto da memória na mesma hora.
    const currentRole = getStoredRole(slug);
    if (currentRole === 'viewer') {
      router.push(`/g/${slug}`);
    } else {
      if (currentRole === 'admin') setIsAdmin(true);
    }
  }, [slug, router]);

  const loadData = () => {
    apiFetch(slug, `/api/sessions/active?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        if (!data.session || !data.session.champion_name) {
          router.push(`/g/${slug}`);
          return;
        }
        setSessionInfo(data.session);
        setSets(data.sets || []);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => { loadData(); }, [slug]);

  // Contagem de vitórias
  const champWins = sets.filter(s => s.winner === 'champion').length;
  const challWins = sets.filter(s => s.winner === 'challenger').length;

  // Registrar Vitória
  const handleWin = async (winner: 'champion' | 'challenger') => {
    setRecording(true);
    try {
      await apiFetch(slug, '/api/sets/record', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionInfo.id, winner })
      });
      loadData(); // Recarrega os dados pra atualizar o placar na tela
    } catch (e) {
      alert("Erro ao anotar a vitória!");
    } finally {
      setRecording(false);
    }
  };

  // Desfazer Último Set
  const handleUndo = async () => {
    if (sets.length === 0) return;
    setRecording(true);
    try {
      await apiFetch(slug, '/api/sets/undo', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionInfo.id })
      });
      loadData(); 
    } catch (e) {
      alert("Não deu pra desfazer.");
    } finally {
      setRecording(false);
    }
  };

  // Encerrar o dia de Vôlei
  const executeEndSession = async () => {
    try {
      await apiFetch(slug, '/api/sessions/end', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionInfo.id })
      });
      router.push(`/g/${slug}`);
    } catch (e) {
      alert("Erro ao fechar a quadra.");
    }
  };

  if (!sessionInfo) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><h2 className="text-green-800 font-black text-2xl animate-pulse">Limpando os óculos... 🕶️</h2></div>;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col font-sans relative overflow-hidden">
      
      {/* HEADER ESCURO (Foco total nos botões) */}
      <div className="flex justify-between items-center p-4 bg-black/40 backdrop-blur-md relative z-20">
        <button onClick={() => router.push(`/g/${slug}`)} className="text-gray-300 font-black flex items-center gap-2">
          <span>◀</span> Sair
        </button>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/g/${slug}/setup`)} className="bg-blue-500/20 text-blue-400 border border-blue-500/50 px-3 py-2 rounded-xl font-black text-sm active:bg-blue-500/40">
            🔄 Trocar Times
          </button>
          {isAdmin && (
            <button onClick={() => setShowEndModal(true)} className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-2 rounded-xl font-black text-sm active:bg-red-500/40">
              🛑 Encerrar Dia
            </button>
          )}
        </div>
      </div>

      <div className="text-center py-4 relative z-20">
        <h2 className="text-gray-400 font-black tracking-widest text-sm uppercase">Sets Jogados: {sets.length}</h2>
      </div>

      {/* ÁREA GIGANTE DOS BOTÕES */}
      <div className="flex-1 flex flex-col sm:flex-row gap-4 p-4 pb-24 relative z-20">
        
        {/* TIME VERDE */}
        <button 
          onClick={() => handleWin('champion')} 
          disabled={recording}
          className="flex-1 bg-green-500 rounded-[2.5rem] border-b-[12px] border-green-700 active:border-b-0 active:translate-y-3 transition-all flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group disabled:opacity-70 disabled:scale-95"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 text-8xl font-black text-green-900 drop-shadow-md">
            <span>{champWins}</span>
            <span className="text-5xl">🏐</span> {/* Ícone de Vôlei TEMÁTICO! */}
          </div>
          {/* Nome curto e sem quebra de linha! */}
          <span className="text-3xl font-black text-white mt-4 text-center px-4 leading-tight drop-shadow-md">
            {sessionInfo.champion_name}
          </span>
          <span className="mt-6 bg-green-900/30 text-green-100 px-6 py-2 rounded-full font-black text-lg backdrop-blur-sm border border-green-400/30">
            CRAVOU! 🔥
          </span>
        </button>

        {/* TIME VERMELHO/LARANJA */}
        <button 
          onClick={() => handleWin('challenger')} 
          disabled={recording}
          className="flex-1 bg-orange-500 rounded-[2.5rem] border-b-[12px] border-orange-700 active:border-b-0 active:translate-y-3 transition-all flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group disabled:opacity-70 disabled:scale-95"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 text-8xl font-black text-orange-900 drop-shadow-md">
            <span>{challWins}</span>
            <span className="text-5xl">🏐</span> {/* Ícone de Vôlei TEMÁTICO! */}
          </div>
          {/* Nome curto e sem quebra de linha! */}
          <span className="text-3xl font-black text-white mt-4 text-center px-4 leading-tight drop-shadow-md">
            {sessionInfo.challenger_name}
          </span>
          <span className="mt-6 bg-orange-900/30 text-orange-100 px-6 py-2 rounded-full font-black text-lg backdrop-blur-sm border border-orange-400/30">
            CRAVOU! 🔥
          </span>
        </button>

      </div>

      {/* RODAPÉ: BOTÃO DESFAZER */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent z-30 flex justify-center">
        <button 
          onClick={handleUndo} 
          disabled={sets.length === 0 || recording}
          className="bg-gray-800 text-gray-400 border-2 border-gray-700 px-6 py-3 rounded-2xl font-black text-lg active:scale-95 transition-transform disabled:opacity-30 flex items-center gap-2 shadow-lg"
        >
          <span>↩️</span> Desfazer último set
        </button>
      </div>

      {/* MODAL CÔMICO DE ENCERRAR O DIA */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border-b-8 border-gray-900 animate-in zoom-in duration-200 text-center">
            <div className="text-7xl mb-4 drop-shadow-lg">🚿</div>
            <h2 className="text-3xl font-black text-white mb-2 leading-tight">Bora pro banho?</h2>
            <p className="text-gray-400 font-bold mb-6 text-lg">Isso vai encerrar a rodada de hoje e salvar tudo no histórico. Todo mundo já cansou?</p>
            <div className="flex flex-col gap-3">
              <button onClick={executeEndSession} className="bg-red-500 text-white text-2xl font-black py-4 rounded-2xl border-b-8 border-red-700 active:border-b-0 active:translate-y-2 transition-all">Encerrar a brincadeira 🛑</button>
              <button onClick={() => setShowEndModal(false)} className="bg-gray-700 text-gray-300 text-xl font-black py-4 rounded-2xl border-b-4 border-gray-900 active:translate-y-1">Ainda tem fôlego! 🏐</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}