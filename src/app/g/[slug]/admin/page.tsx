'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, useAVLAuth } from '@/lib/avlClient';

interface PlayerExt { id: string; name: string; is_guest?: boolean; }

export default function Admin() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const { role } = useAVLAuth(slug);
  
  const [players, setPlayers] = useState<PlayerExt[]>([]);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [starting, setStarting] = useState(false);

  // Estados do Smart Input de Visitantes
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingGuest, setAddingGuest] = useState(false);

  useEffect(() => {
    if (role !== 'admin' && role !== 'viewer') router.push(`/g/${slug}`);
  }, [role, slug, router]);

  const loadPlayers = async () => {
    try {
      const res = await apiFetch(slug, `/api/players/list?slug=${slug}`);
      const data = await res.json();
      if (!data.error) setPlayers(data.players || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { loadPlayers(); }, [slug]);

  const togglePresence = (id: string) => {
    const next = new Set(presentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPresentIds(next);
  };

  const handleAddGuest = async (existingId?: string, newName?: string) => {
    if (existingId) {
      togglePresence(existingId);
      setSearchTerm('');
      setShowDropdown(false);
      return;
    }

    if (!newName || !newName.trim()) return;
    
    setAddingGuest(true);
    try {
      const res = await apiFetch(slug, '/api/players/add', {
        method: 'POST',
        body: JSON.stringify({ slug, name: newName.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        setSearchTerm('');
        setShowDropdown(false);
        await loadPlayers();
        togglePresence(data.player.id);
      }
    } catch (e) {
      alert('Erro ao convocar o visitante.');
    } finally {
      setAddingGuest(false);
    }
  };

  const executeStart = async () => {
    if (presentIds.size < 4) return alert('No mínimo 4 pessoas pra isolar a bola, né?');
    setStarting(true);
    try {
      await apiFetch(slug, '/api/sessions/start', {
        method: 'POST',
        body: JSON.stringify({ slug, note, present_player_ids: Array.from(presentIds) })
      });
      router.push(`/g/${slug}/setup`);
    } catch (e) {
      alert('Areia no olho! Erro ao criar rodada.');
      setStarting(false);
    }
  };

  const fixedPlayers = players.filter(p => !p.is_guest);
  const guestPlayers = players.filter(p => p.is_guest);
  const absentGuests = guestPlayers.filter(p => !presentIds.has(p.id));
  
  const normalizedSearch = searchTerm.toLowerCase();
  const filteredGuests = absentGuests.filter(p => p.name.toLowerCase().includes(normalizedSearch));
  const exactMatchExists = filteredGuests.some(p => p.name.toLowerCase() === normalizedSearch);

  return (
    <div className="min-h-screen bg-green-50 p-4 pb-20 max-w-md mx-auto font-sans relative">
      <button onClick={() => router.push(`/g/${slug}`)} className="text-orange-500 font-black mb-4 text-lg flex items-center gap-2">
        <span>◀</span> Voltar pra sombra
      </button>
      
      <h1 className="text-4xl font-black text-green-900 mb-6 leading-tight">
        Prancheta<br/><span className="text-2xl text-orange-500">do Professor</span> 📋
      </h1>

      {/* PAINEL DE VISITANTES (SMART INPUT) */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border-b-8 border-green-200 mb-6 relative z-40">
        <h3 className="font-black text-orange-800 mb-3 flex items-center gap-2">🎒 Chegou visitante?</h3>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar visitante ou digitar novo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="w-full bg-gray-50 border-4 border-gray-100 rounded-2xl p-4 font-black text-gray-700 outline-none focus:border-orange-500 focus:bg-white transition-all"
            disabled={addingGuest}
          />
          {addingGuest && <span className="absolute right-4 top-4 text-orange-500 animate-spin">⏳</span>}

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-orange-200 rounded-[1.5rem] shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                
                {filteredGuests.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-3 py-1">Histórico de Visitantes</div>
                    {filteredGuests.map(p => (
                      <button key={p.id} onClick={() => handleAddGuest(p.id)} className="w-full text-left font-black text-orange-900 bg-orange-50 hover:bg-orange-100 p-3 rounded-xl mb-1 active:scale-95 transition-transform">
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {searchTerm.trim() !== '' && !exactMatchExists && (
                  <div className="p-2 border-t-4 border-orange-100 bg-orange-50">
                    <button onClick={() => handleAddGuest(undefined, searchTerm)} className="w-full flex items-center justify-between text-left font-black text-white bg-orange-500 hover:bg-orange-600 p-4 rounded-xl active:scale-95 transition-transform shadow-sm">
                      <span>Cadastrar "{searchTerm}"</span>
                      <span className="bg-white text-orange-600 px-2 py-1 rounded-lg text-xs uppercase tracking-wider">+ Novo</span>
                    </button>
                  </div>
                )}

                {filteredGuests.length === 0 && searchTerm.trim() === '' && (
                  <div className="p-6 text-center text-gray-400 font-bold">
                    Digite um nome para buscar ou adicionar! 🎒
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* LISTA DOS FIXOS */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border-b-8 border-green-200 mb-6 relative z-10">
        <h2 className="text-2xl font-black text-green-800 mb-1">A Galera de Sempre</h2>
        <p className="text-sm text-gray-400 font-bold mb-4">{presentIds.size} escalados no total</p>
        
        <div className="flex flex-col gap-3 max-h-80 overflow-y-auto mb-6 p-2">
          {fixedPlayers.map(p => (
            <label key={p.id} className={`flex items-center p-4 rounded-2xl border-4 transition-all cursor-pointer ${presentIds.has(p.id) ? 'bg-green-100 border-green-500 scale-[1.02]' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
              <input type="checkbox" checked={presentIds.has(p.id)} onChange={() => togglePresence(p.id)} className="w-8 h-8 mr-4 rounded-xl accent-orange-500" />
              <span className="font-black text-gray-800 text-xl">{p.name}</span>
            </label>
          ))}

          {guestPlayers.filter(p => presentIds.has(p.id)).map(p => (
            <label key={p.id} className="flex items-center p-4 rounded-2xl border-4 bg-orange-100 border-orange-500 scale-[1.02] cursor-pointer">
              <input type="checkbox" checked={presentIds.has(p.id)} onChange={() => togglePresence(p.id)} className="w-8 h-8 mr-4 rounded-xl accent-orange-500" />
              <span className="font-black text-orange-900 text-xl">{p.name} <span className="text-xs text-orange-600 uppercase tracking-widest bg-orange-200 px-2 py-1 rounded-lg ml-2">Visitante</span></span>
            </label>
          ))}
        </div>

        <input
          type="text"
          placeholder="Nota (Ex: Vento contra, areia fofa...)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-4 rounded-2xl bg-gray-50 border-4 border-gray-100 focus:border-orange-400 outline-none font-bold text-gray-700 mb-6 text-lg"
        />

        <button
          onClick={executeStart}
          disabled={starting || presentIds.size < 4}
          className="w-full bg-orange-500 text-white text-2xl font-black py-5 rounded-[1.5rem] border-b-8 border-orange-700 active:translate-y-2 active:border-b-0 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {starting ? 'Amarrando a rede...' : 'CRIAR RODADA 🏐'}
        </button>
      </div>
    </div>
  );
}