'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, useAVLAuth } from '@/lib/avlClient';

interface PlayerExt { id: string; name: string; is_guest?: boolean; }

export default function Setup() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const { role } = useAVLAuth(slug);
  
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerExt[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [rankingsMap, setRankingsMap] = useState<Record<string, number>>({});
  
  const [championIds, setChampionIds] = useState<string[]>([]);
  const [challengerIds, setChallengerIds] = useState<string[]>([]);
  const [poolIds, setPoolIds] = useState<string[]>([]); 
  
  const [champName, setChampName] = useState('Sem Colete 🦖');
  const [challName, setChallName] = useState('Com Colete 🦕');
  const [saving, setSaving] = useState(false);

  // Atrasados (Smart Input)
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [addingLate, setAddingLate] = useState(false);
  
  const [showAbortModal, setShowAbortModal] = useState(false);

  useEffect(() => {
    if (role !== 'admin' && role !== 'viewer') router.push(`/g/${slug}`);
  }, [role, slug, router]);

  const loadData = () => {
    Promise.all([
      apiFetch(slug, `/api/sessions/active?slug=${slug}`),
      apiFetch(slug, `/api/players/list?slug=${slug}`),
      apiFetch(slug, `/api/rankings/month?slug=${slug}`).catch(() => null)
    ]).then(async ([sessRes, playRes, rankRes]) => {
      const sessData = await sessRes.json();
      const playData = await playRes.json();
      
      setSessionInfo(sessData.session);
      setAllPlayers(playData.players || []);
      
      const pMap: Record<string, string> = {};
      if (playData.players) {
        playData.players.forEach((p: PlayerExt) => { pMap[p.id] = p.name; });
      }
      setPlayersMap(pMap);

      const rMap: Record<string, number> = {};
      if (rankRes && rankRes.ok) {
        const rankData = await rankRes.json();
        rankData.rankings?.forEach((r: any) => {
          const player = playData.players?.find((p: PlayerExt) => p.name === r.name);
          if (player) rMap[player.id] = r.points;
        });
      }
      setRankingsMap(rMap);
      
      if (sessData.session?.present_player_ids) {
        const currentPresent = sessData.session.present_player_ids;
        const alreadyInTeams = [...championIds, ...challengerIds];
        const onlyInPool = currentPresent.filter((id: string) => !alreadyInTeams.includes(id));
        setPoolIds(onlyInPool);
      }
    }).catch(err => console.error(err));
  };

  useEffect(() => { loadData(); }, [slug]);

  const handleAddLatecomer = async (existingId?: string, newName?: string) => {
    setAddingLate(true);
    let idToAdd = existingId;

    try {
      if (newName && newName.trim() !== '') {
        const res = await apiFetch(slug, '/api/players/add', {
          method: 'POST',
          body: JSON.stringify({ slug, name: newName.trim() })
        });
        const data = await res.json();
        if(data.error) throw new Error(data.error);
        idToAdd = data.player.id;
        setPlayersMap(prev => ({ ...prev, [idToAdd as string]: data.player.name }));
        setAllPlayers(prev => [...prev, data.player]);
      }

      if (!idToAdd) return;

      const newPool = [...poolIds, idToAdd];
      setPoolIds(newPool);

      const allPresentNow = [...championIds, ...challengerIds, ...newPool];
      await apiFetch(slug, '/api/sessions/update-presence', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionInfo.id, present_player_ids: allPresentNow })
      });

      setSearchTerm('');
      setShowDropdown(false);
    } catch (e) {
      alert("Erro ao botar o pereba no jogo.");
    } finally {
      setAddingLate(false);
    }
  };

  // ==========================================
  // REMOVER DA SESSÃO (Sem confirmação chata!)
  // ==========================================
  const handleRemoveFromSession = async (idToRemove: string) => {
    // 1. Tira da tela imediatamente (Optimistic UI) para parecer super rápido
    const newPool = poolIds.filter(id => id !== idToRemove);
    setPoolIds(newPool);

    // 2. Atualiza o banco no fundo silenciosamente
    const allPresentNow = [...championIds, ...challengerIds, ...newPool];
    try {
      await apiFetch(slug, '/api/sessions/update-presence', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionInfo.id, present_player_ids: allPresentNow })
      });
    } catch (e) {
      alert("Deu erro ao remover o jogador. O banco de dados tropeçou!");
      // Se der erro, a gente poderia colocar o cara de volta, mas vamos manter simples
    }
  };

  const movePlayer = (id: string, from: 'pool'|'champ'|'chall', to: 'pool'|'champ'|'chall') => {
    const removers = {
      pool: () => setPoolIds(prev => prev.filter(x => x !== id)),
      champ: () => setChampionIds(prev => prev.filter(x => x !== id)),
      chall: () => setChallengerIds(prev => prev.filter(x => x !== id))
    };
    const adders = {
      pool: () => setPoolIds(prev => [...prev, id]),
      champ: () => setChampionIds(prev => [...prev, id]),
      chall: () => setChallengerIds(prev => [...prev, id])
    };
    removers[from]();
    adders[to]();
  };

  const handleBalancedRandomize = () => {
    const allPresent = [...poolIds, ...championIds, ...challengerIds];
    if (allPresent.length < 4) return alert('Tem pouca gente pra sortear!');

    const shuffled = [...allPresent].sort(() => Math.random() - 0.5);
    let playing: string[] = [];
    let bench: string[] = [];

    if (shuffled.length <= 12) {
      playing = shuffled;
    } else if (shuffled.length === 13) {
      playing = shuffled.slice(0, 12);
      bench = shuffled.slice(12);
    } else {
      playing = shuffled.slice(0, 12);
      bench = shuffled.slice(12);
    }

    playing.sort((a, b) => (rankingsMap[b] || 0) - (rankingsMap[a] || 0));

    const champ: string[] = [];
    const chall: string[] = [];
    let champPts = 0;
    let challPts = 0;

    playing.forEach(playerId => {
      const pts = rankingsMap[playerId] || 0;
      if (champPts <= challPts && champ.length < 6) {
        champ.push(playerId); champPts += pts;
      } else if (chall.length < 6) {
        chall.push(playerId); challPts += pts;
      } else {
        champ.push(playerId); champPts += pts;
      }
    });

    setChampionIds(champ);
    setChallengerIds(chall);
    setPoolIds(bench);
  };

  const executeAbort = async () => {
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

  const handleSave = async () => {
    if (!champName.trim() || !challName.trim()) return alert('Dá um nome pros times!');
    if (championIds.length === 0 || challengerIds.length === 0) return alert('Times vazios!');
    setSaving(true);
    try {
      const allPresentNow = [...championIds, ...challengerIds, ...poolIds];
      await apiFetch(slug, '/api/sessions/setup-teams', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionInfo.id,
          champion_name: champName,
          challenger_name: challName,
          champion_player_ids: championIds,
          challenger_player_ids: challengerIds,
        })
      });
      await apiFetch(slug, '/api/sessions/update-presence', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionInfo.id, present_player_ids: allPresentNow })
      });
      router.push(`/g/${slug}/game`);
    } catch (e) {
      alert('Deu ruim ao salvar os times!');
      setSaving(false);
    }
  };

  if (!sessionInfo) return <div className="min-h-screen bg-green-50 flex items-center justify-center"><h2 className="text-green-800 font-black text-2xl animate-pulse">Pintando as linhas da quadra... 🏐</h2></div>;

  const poolTitle = poolIds.length >= 5 ? `Time de Fora / Próximos (${poolIds.length})` : `Banco de Areia (${poolIds.length})`;
  
  const allPresent = [...poolIds, ...championIds, ...challengerIds];
  const absentPlayers = allPlayers.filter(p => !allPresent.includes(p.id));
  
  const normalizedSearch = searchTerm.toLowerCase();
  const filteredAbsent = absentPlayers.filter(p => p.name.toLowerCase().includes(normalizedSearch));
  const exactMatchExists = filteredAbsent.some(p => p.name.toLowerCase() === normalizedSearch);
  
  const filteredFixos = filteredAbsent.filter(p => !p.is_guest);
  const filteredGuests = filteredAbsent.filter(p => p.is_guest);

  return (
    <div className="min-h-screen bg-orange-50 p-4 pb-20 max-w-md mx-auto font-sans relative">
      
      {/* HEADER E ABORTAR */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.push(`/g/${slug}`)} className="text-orange-800 font-black flex items-center gap-2">
          <span>◀</span> Sair
        </button>
        <button onClick={() => setShowAbortModal(true)} className="text-red-500 bg-red-100 px-3 py-2 rounded-xl font-black text-sm border-b-4 border-red-200 active:translate-y-1">
          🛑 Abortar Rodada
        </button>
      </div>
      
      <h1 className="text-3xl font-black text-orange-900 mb-6 text-center leading-tight">
        Tirando os<br/><span className="text-orange-500">Times</span> 🤼
      </h1>

      {/* SESSÃO DE ATRASADOS (SMART INPUT) */}
      <div className="bg-white p-5 rounded-[2rem] mb-6 shadow-sm border-b-8 border-orange-200 relative z-40">
        <h3 className="font-black text-orange-800 mb-3 flex items-center gap-2">⏱️ Chegou atrasado?</h3>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar nome ou digitar novo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="w-full bg-gray-50 border-4 border-gray-100 rounded-2xl p-4 font-black text-gray-700 outline-none focus:border-orange-500 focus:bg-white transition-all"
            disabled={addingLate}
          />
          {addingLate && <span className="absolute right-4 top-4 text-orange-500 animate-spin">⏳</span>}

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-orange-200 rounded-[1.5rem] shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                
                {filteredFixos.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-3 py-1">A Galera (Fixos)</div>
                    {filteredFixos.map(p => (
                      <button key={p.id} onClick={() => handleAddLatecomer(p.id)} className="w-full text-left font-black text-green-900 bg-green-50 hover:bg-green-100 p-3 rounded-xl mb-1 active:scale-95 transition-transform">
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {filteredGuests.length > 0 && (
                  <div className="p-2 border-t-2 border-gray-50">
                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest px-3 py-1">Visitantes Antigos</div>
                    {filteredGuests.map(p => (
                      <button key={p.id} onClick={() => handleAddLatecomer(p.id)} className="w-full text-left font-black text-orange-900 bg-orange-50 hover:bg-orange-100 p-3 rounded-xl mb-1 active:scale-95 transition-transform">
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {searchTerm.trim() !== '' && !exactMatchExists && (
                  <div className="p-2 border-t-4 border-orange-100 bg-orange-50">
                    <button onClick={() => handleAddLatecomer(undefined, searchTerm)} className="w-full flex items-center justify-between text-left font-black text-white bg-orange-500 hover:bg-orange-600 p-4 rounded-xl active:scale-95 transition-transform shadow-sm">
                      <span>Adicionar "{searchTerm}"</span>
                      <span className="bg-white text-orange-600 px-2 py-1 rounded-lg text-xs uppercase tracking-wider">+ Novo</span>
                    </button>
                  </div>
                )}

                {filteredAbsent.length === 0 && searchTerm.trim() === '' && (
                  <div className="p-6 text-center text-gray-400 font-bold">
                    Todo mundo já tá na quadra! 🙌
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <button onClick={handleBalancedRandomize} className="w-full bg-blue-500 text-white text-xl font-black py-5 rounded-[1.5rem] border-b-8 border-blue-700 active:border-b-0 active:translate-y-2 transition-all shadow-md mb-6 flex justify-center items-center gap-2">
        ⚖️ SORTEIO BALANCEADO
      </button>

      {/* BANCO DE AREIA COM BOTÃO DE EXCLUIR MENORZINHO */}
      {poolIds.length > 0 && (
        <div className="bg-white p-5 rounded-[2rem] mb-6 border-4 border-orange-200 shadow-sm relative z-10">
          <h3 className="font-black text-gray-400 mb-3 text-lg">{poolTitle}</h3>
          <div className="flex flex-wrap gap-3">
            {poolIds.map(id => (
              <div key={id} className="bg-gray-100 pl-4 pr-2 py-2 rounded-2xl flex items-center gap-2 shadow-sm border-2 border-gray-200">
                <span className="font-black text-gray-800 text-lg whitespace-nowrap">{playersMap[id] || 'Pereba'}</span>
                
                <div className="flex gap-1 ml-1">
                  <button onClick={() => movePlayer(id, 'pool', 'champ')} className="bg-green-100 text-green-600 px-3 py-1 rounded-xl font-black text-xl active:scale-95 transition-transform">◀</button>
                  <button onClick={() => movePlayer(id, 'pool', 'chall')} className="bg-red-100 text-red-600 px-3 py-1 rounded-xl font-black text-xl active:scale-95 transition-transform">▶</button>
                  {/* Lixeira Menor e sem confirmação */}
                  <button onClick={() => handleRemoveFromSession(id)} className="bg-gray-200 text-gray-500 hover:bg-red-200 hover:text-red-600 px-2 py-1 rounded-lg font-black text-lg active:scale-95 transition-colors ml-1" title="Mandar pro chuveiro">
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-8 relative z-10">
        <div className="flex-1 bg-green-50 border-4 border-green-500 rounded-[2rem] p-3 shadow-sm relative overflow-hidden">
          <input type="text" value={champName} onChange={e => setChampName(e.target.value)} className="w-full bg-white/50 font-black text-green-900 text-center mb-3 border-b-4 border-green-300 outline-none p-2 rounded-xl text-sm focus:bg-white" />
          <div className="flex flex-col gap-2 min-h-[150px]">
            {championIds.map(id => (
              <div key={id} className="bg-green-500 text-white font-black p-2 rounded-xl flex justify-between items-center text-sm shadow-sm">
                <span className="truncate">{playersMap[id]}</span>
                <button onClick={() => movePlayer(id, 'champ', 'pool')} className="bg-green-700 text-green-100 px-2 py-1 rounded-lg">✕</button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-red-50 border-4 border-red-500 rounded-[2rem] p-3 shadow-sm relative overflow-hidden">
          <input type="text" value={challName} onChange={e => setChallName(e.target.value)} className="w-full bg-white/50 font-black text-red-900 text-center mb-3 border-b-4 border-red-300 outline-none p-2 rounded-xl text-sm focus:bg-white" />
          <div className="flex flex-col gap-2 min-h-[150px]">
            {challengerIds.map(id => (
              <div key={id} className="bg-red-500 text-white font-black p-2 rounded-xl flex justify-between items-center text-sm shadow-sm">
                <span className="truncate">{playersMap[id]}</span>
                <button onClick={() => movePlayer(id, 'chall', 'pool')} className="bg-red-700 text-red-100 px-2 py-1 rounded-lg">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving || championIds.length === 0 || challengerIds.length === 0} className="w-full bg-orange-500 text-white text-3xl font-black py-6 rounded-[2rem] border-b-8 border-orange-700 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50 shadow-lg relative z-10">
        {saving ? 'Anotando na areia...' : 'BOLA PRO ALTO! 🏐'}
      </button>

      {/* MODAL CÔMICO DE ABORTAR */}
      {showAbortModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border-b-8 border-red-500 animate-in zoom-in duration-200 text-center">
            <div className="text-7xl mb-4 drop-shadow-md">⛈️</div>
            <h2 className="text-3xl font-black text-red-700 mb-2 leading-tight">Murchar a bola?</h2>
            <p className="text-gray-500 font-bold mb-6">Tem certeza? O juiz já tava passando protetor solar!</p>
            <div className="flex flex-col gap-3">
              <button onClick={executeAbort} className="bg-red-500 text-white text-2xl font-black py-4 rounded-2xl border-b-8 border-red-700 active:border-b-0 active:translate-y-2 transition-all">Sim, furou! 🛑</button>
              <button onClick={() => setShowAbortModal(false)} className="bg-gray-100 text-gray-600 text-xl font-black py-4 rounded-2xl border-b-4 border-gray-300 active:translate-y-1">Não, bora pro jogo! 🏐</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}