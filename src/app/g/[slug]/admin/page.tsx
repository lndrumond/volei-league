'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/avlClient';

interface Player { id: string; name: string; is_guest: boolean; }

export default function AdminPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 🚨 NOVO ESTADO: Guarda o nome da rodada!
  const [sessionDesc, setSessionDesc] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const res = await apiFetch(slug, `/api/players/list?slug=${slug}`);
        const data = await res.json();
        setPlayers(data.players || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadPlayers();
  }, [slug]);

  const handleAddPlayer = async (isGuest: boolean) => {
    if (!searchTerm.trim()) return;
    setAdding(true);
    try {
      const res = await apiFetch(slug, '/api/players/add', {
        method: 'POST',
        body: JSON.stringify({ slug, name: searchTerm.trim(), is_guest: isGuest })
      });
      const data = await res.json();
      if (data.ok) {
        setPlayers([...players, data.player]);
        setPresentIds([...presentIds, data.player.id]); 
        setSearchTerm(''); 
      } else {
        alert('Erro ao adicionar jogador.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleGuestStatus = async (e: React.MouseEvent, playerId: string, makeGuest: boolean) => {
    e.stopPropagation(); 
    try {
      const res = await apiFetch(slug, '/api/players/update', {
        method: 'PUT',
        body: JSON.stringify({ player_id: playerId, is_guest: makeGuest })
      });
      const data = await res.json();
      if (data.ok) {
        setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, is_guest: makeGuest } : p));
      } else {
        alert('Erro ao mudar o status.');
      }
    } catch (err) {
      alert('Erro de conexão ao mudar status.');
    }
  };

  const togglePresence = (id: string) => {
    setPresentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleStartSession = async () => {
    if (presentIds.length < 4) {
      return alert('Precisa de pelo menos 4 pessoas pra dar jogo!');
    }
    setStarting(true);
    try {
      const res = await apiFetch(slug, '/api/sessions/start', {
        method: 'POST',
        // 🚨 Manda a descrição lá pra API
        body: JSON.stringify({ slug, present_player_ids: presentIds, description: sessionDesc })
      });
      const data = await res.json();
      if (data.ok) {
        router.push(`/g/${slug}/setup`);
      } else {
        alert(data.error || 'Erro ao iniciar a rodada.');
        setStarting(false);
      }
    } catch (e) {
      alert('Erro ao iniciar a rodada.');
      setStarting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><h2 className="text-green-800 font-black text-2xl animate-pulse">Buscando a prancheta... 📋</h2></div>;

  const normalizedSearch = searchTerm.toLowerCase();
  const exactMatchExists = players.some(p => p.name.toLowerCase() === normalizedSearch.trim());

  const fixos = players.filter(p => !p.is_guest);
  const visitantes = players.filter(p => p.is_guest);

  const visibleFixos = fixos.filter(p => p.name.toLowerCase().includes(normalizedSearch));
  const visibleVisitantes = visitantes.filter(p => {
    const matchesSearch = searchTerm.trim() !== '' && p.name.toLowerCase().includes(normalizedSearch);
    const isSelected = presentIds.includes(p.id);
    return matchesSearch || isSelected;
  });

  return (
    <div className="min-h-screen bg-green-50 p-4 pb-32 max-w-md mx-auto font-sans relative">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.push(`/g/${slug}`)} className="text-green-800 font-black flex items-center gap-2">
          <span>◀</span> Sair
        </button>
      </div>

      <h1 className="text-3xl font-black text-green-900 mb-2 text-center leading-tight">
        Quem desceu<br/><span className="text-green-600">pra areia?</span> 📋
      </h1>
      <p className="text-center text-green-700 font-bold mb-6">Selecione a galera que vai jogar hoje.</p>

      {/* 🚨 CAMPO DE NOME DA RODADA 🚨 */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm mb-4 border-b-8 border-green-200">
        <h3 className="font-black text-green-800 mb-2 flex items-center gap-2">📝 Nome da Rodada</h3>
        <input 
          type="text" 
          placeholder="Ex: Domingueira, Feriado..." 
          value={sessionDesc}
          onChange={(e) => setSessionDesc(e.target.value)}
          className="w-full bg-gray-50 border-4 border-gray-100 rounded-xl p-3 font-black text-gray-700 outline-none focus:border-green-500 transition-all text-sm"
        />
        <p className="text-[10px] text-gray-400 font-bold mt-2 ml-1 uppercase tracking-wider">Deixe em branco para usar a data de hoje.</p>
      </div>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm mb-6 border-b-8 border-green-200 sticky top-4 z-10">
        <input 
          type="text" 
          placeholder="🔍 Buscar ou Adicionar Novo..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-50 border-4 border-gray-100 rounded-xl p-4 font-black text-gray-700 outline-none focus:border-green-500 transition-all"
        />
        
        {searchTerm.trim() !== '' && !exactMatchExists && (
          <div className="flex gap-2 animate-in fade-in zoom-in duration-200 mt-3 border-t-4 border-dashed border-gray-100 pt-3">
            <button onClick={() => handleAddPlayer(false)} disabled={adding} className="flex-1 bg-green-500 text-white font-black py-3 rounded-xl active:scale-95 transition-transform shadow-sm flex flex-col items-center">
              <span className="text-[10px] uppercase opacity-80">Adicionar</span>
              <span>Fixo 🤝</span>
            </button>
            <button onClick={() => handleAddPlayer(true)} disabled={adding} className="flex-1 bg-orange-500 text-white font-black py-3 rounded-xl active:scale-95 transition-transform shadow-sm flex flex-col items-center">
              <span className="text-[10px] uppercase opacity-80">Adicionar</span>
              <span>Visitante 🧳</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-gray-800">Lista de Jogadores</h2>
        <span className="bg-green-200 text-green-800 px-3 py-1 rounded-xl font-black text-sm">
          {presentIds.length} na quadra
        </span>
      </div>

      <div className="flex flex-col gap-4 mb-8">
        
        {visibleFixos.length > 0 && (
          <div className="bg-white p-2 rounded-[2rem] shadow-sm border-2 border-green-100">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2">A Galera (Fixos)</div>
            {visibleFixos.map(p => (
              <div key={p.id} onClick={() => togglePresence(p.id)} className={`flex items-center justify-between p-3 rounded-2xl mb-1 cursor-pointer transition-colors ${presentIds.includes(p.id) ? 'bg-green-100' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${presentIds.includes(p.id) ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                    {presentIds.includes(p.id) && <span className="text-white text-sm font-black">✓</span>}
                  </div>
                  <span className={`font-black text-lg ${presentIds.includes(p.id) ? 'text-green-900' : 'text-gray-600'}`}>{p.name}</span>
                </div>
                <button onClick={(e) => handleToggleGuestStatus(e, p.id, true)} className="p-2 text-xl hover:scale-110 transition-transform grayscale opacity-30 hover:grayscale-0 hover:opacity-100" title="Rebaixar para Visitante">
                  🧳
                </button>
              </div>
            ))}
          </div>
        )}

        {visibleVisitantes.length > 0 && (
          <div className="bg-white p-2 rounded-[2rem] shadow-sm border-2 border-orange-100">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-4 py-2">Visitantes</div>
            {visibleVisitantes.map(p => (
              <div key={p.id} onClick={() => togglePresence(p.id)} className={`flex items-center justify-between p-3 rounded-2xl mb-1 cursor-pointer transition-colors ${presentIds.includes(p.id) ? 'bg-orange-100' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${presentIds.includes(p.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                    {presentIds.includes(p.id) && <span className="text-white text-sm font-black">✓</span>}
                  </div>
                  <span className={`font-black text-lg ${presentIds.includes(p.id) ? 'text-orange-900' : 'text-gray-600'}`}>{p.name}</span>
                </div>
                <button onClick={(e) => handleToggleGuestStatus(e, p.id, false)} className="p-2 text-xl hover:scale-110 transition-transform drop-shadow-sm" title="Promover a Fixo">
                  ⭐
                </button>
              </div>
            ))}
          </div>
        )}

        {visibleFixos.length === 0 && visibleVisitantes.length === 0 && searchTerm !== '' && (
          <div className="text-center py-8 text-gray-400 font-bold">
            <div className="text-4xl mb-2">🤷‍♂️</div>
            Nenhum jogador encontrado.<br/>Adicione ali em cima!
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-green-50 via-green-50/90 to-transparent z-40 max-w-md mx-auto">
        <button 
          onClick={handleStartSession} 
          disabled={starting || presentIds.length < 4}
          className="w-full bg-green-500 text-white text-2xl font-black py-5 rounded-[2rem] border-b-8 border-green-700 active:border-b-0 active:translate-y-2 transition-all shadow-lg disabled:opacity-50 disabled:active:border-b-8 disabled:active:translate-y-0 flex justify-center items-center gap-2"
        >
          {starting ? 'PREPARANDO...' : 'INICIAR RODADA 🏐'}
        </button>
      </div>
    </div>
  );
}