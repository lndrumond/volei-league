'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { saveAuth } from '@/lib/avlClient';

interface Player {
  id: string;
  name: string;
  is_guest: boolean;
  skill_rating?: number;
}

interface VoterStatus {
  id: string;
  name: string;
  status: 'NO_PIN' | 'PENDING' | 'VOTED' | 'EXPIRED';
  pin: string | null;
  expires_at: string | null;
}

interface AuditVote {
  id: string;
  voter_name: string;
  target_name: string;
  score: number;
  created_at: string;
}

export default function SuperAdminPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();

  // Autenticação simples local
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Controle de Abas (1: Alvos, 2: PINs, 3: Auditoria)
  const [activeTab, setActiveTab] = useState<'targets' | 'pins' | 'audit'>('targets');

  // Estados da Aba 1 (Alvos)
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);

  // Estados da Aba 2 (PINs)
  const [voters, setVoters] = useState<VoterStatus[]>([]);
  const [selectedVoterIds, setSelectedVoterIds] = useState<string[]>([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [generatingPins, setGeneratingPins] = useState(false);

  // Estados da Aba 3 (Auditoria)
  const [auditVotes, setAuditVotes] = useState<AuditVote[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Mensagens de feedback
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Tenta autenticar
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setAuthenticated(true);
        sessionStorage.setItem(`superadmin_${slug}`, data.token);
        // O Super Admin também faz tudo que o admin faz neste aparelho.
        saveAuth(slug, data.token, 'admin');
      } else {
        setAuthError(data.error || 'Senha inválida');
      }
    } catch (err) {
      setAuthError('Erro ao conectar ao servidor.');
    }
  };

  useEffect(() => {
    const token = sessionStorage.getItem(`superadmin_${slug}`);
    if (token) setAuthenticated(true);
  }, [slug]);

  // fetch com o token do Super Admin; se o servidor recusar, volta para a tela de senha.
  const authFetch = async (url: string, init: RequestInit = {}) => {
    const token = sessionStorage.getItem(`superadmin_${slug}`);
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401 || res.status === 403) {
      sessionStorage.removeItem(`superadmin_${slug}`);
      setAuthenticated(false);
      setAuthError('Sessão expirada. Digite a senha de novo.');
    }
    return res;
  };

  // Carrega dados da Aba 1 (Alvos)
  const loadTargets = async () => {
    setLoadingTargets(true);
    try {
      const res = await authFetch(`/api/super-admin/targets?slug=${slug}`);
      const data = await res.json();
      if (data.ok) {
        setAllPlayers(data.players || []);
        setSelectedTargetIds(data.target_player_ids || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTargets(false);
    }
  };

  // Carrega dados da Aba 2 (PINs)
  const loadPins = async () => {
    setLoadingPins(true);
    try {
      const res = await authFetch(`/api/super-admin/pins?slug=${slug}`);
      const data = await res.json();
      if (data.ok) {
        setVoters(data.voters || []);
        // Pré-seleciona todos os fixos por padrão se nenhum estiver selecionado
        if (selectedVoterIds.length === 0) {
          setSelectedVoterIds((data.voters || []).map((v: VoterStatus) => v.id));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPins(false);
    }
  };

  // Carrega dados da Aba 3 (Auditoria)
  const loadAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await authFetch(`/api/super-admin/votes?slug=${slug}`);
      const data = await res.json();
      if (data.ok) {
        setAuditVotes(data.votes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (!authenticated) return;
    if (activeTab === 'targets') loadTargets();
    if (activeTab === 'pins') loadPins();
    if (activeTab === 'audit') loadAudit();
  }, [authenticated, activeTab, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Salva Lista de Alvos
  const handleSaveTargets = async () => {
    setSavingTargets(true);
    setFeedbackMessage('');
    try {
      const res = await authFetch('/api/super-admin/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, target_player_ids: selectedTargetIds }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackMessage('Lista de Alvos salva com sucesso! 🎯');
      } else {
        alert(data.error || 'Erro ao salvar alvos.');
      }
    } catch (e) {
      alert('Erro de conexão ao salvar alvos.');
    } finally {
      setSavingTargets(false);
    }
  };

  // Toggle Seleção de Alvo
  const toggleTarget = (id: string) => {
    setSelectedTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Selecionar/Desselecionar Todos Alvos
  const toggleAllTargets = () => {
    if (selectedTargetIds.length === allPlayers.length) {
      setSelectedTargetIds([]);
    } else {
      setSelectedTargetIds(allPlayers.map((p) => p.id));
    }
  };

  // Toggle Seleção de Votante
  const toggleVoter = (id: string) => {
    setSelectedVoterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Gerar/Renovar PINs
  const handleGeneratePins = async () => {
    if (selectedVoterIds.length === 0) return alert('Selecione pelo menos um jogador Fixo.');
    setGeneratingPins(true);
    setFeedbackMessage('');
    try {
      const res = await authFetch('/api/super-admin/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, player_ids: selectedVoterIds }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackMessage('PINs gerados/renovados com sucesso! 🔑');
        loadPins();
      } else {
        alert(data.error || 'Erro ao gerar PINs.');
      }
    } catch (e) {
      alert('Erro de conexão.');
    } finally {
      setGeneratingPins(false);
    }
  };

  // Monta link do WhatsApp para o votante
  const getWhatsappLink = (voter: VoterStatus) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const voteUrl = `${origin}/g/${slug}/vote?pin=${voter.pin}`;
    const text = `Fala ${voter.name.split(' ')[0]}! O link da urna tá na mão pra dar as notas da rodada: ${voteUrl} . Tem 24h pra votar no sigilo! 🤫🏐`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // --- TELA DE LOGIN ---
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-[2rem] border-4 border-slate-700 shadow-2xl w-full max-w-sm">
          <div className="text-5xl text-center mb-4">🕵️‍♂️</div>
          <h1 className="text-3xl font-black text-center mb-2 text-yellow-400">Super Admin</h1>
          <p className="text-slate-400 text-center font-bold text-sm mb-6">Gestão Secreta do Rating AVL</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Senha Mestra"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900 border-2 border-slate-600 rounded-2xl p-4 font-black text-center text-xl text-yellow-300 outline-none focus:border-yellow-400 transition-colors"
              autoFocus
            />
            {authError && (
              <div className="bg-red-500/20 text-red-300 font-bold p-3 rounded-xl text-center text-sm border border-red-500/30">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="bg-yellow-500 text-slate-950 font-black py-4 rounded-2xl text-xl hover:bg-yellow-400 active:scale-95 transition-all shadow-lg"
            >
              ENTRAR NO PAINEL 🔐
            </button>
          </form>

          <button
            onClick={() => router.push(`/g/${slug}`)}
            className="w-full mt-4 text-slate-400 font-bold text-sm hover:text-white transition-colors"
          >
            ◀ Voltar para a Liga
          </button>
        </div>
      </div>
    );
  }

  // --- PAINEL PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-20 max-w-lg mx-auto font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-yellow-400 flex items-center gap-2">
            <span>🕵️‍♂️</span> Painel Super Admin
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Liga: {slug}</p>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem(`superadmin_${slug}`);
            setAuthenticated(false);
          }}
          className="text-slate-400 font-bold text-xs bg-slate-800 px-3 py-2 rounded-xl hover:text-white hover:bg-slate-700 transition-all"
        >
          Sair 🚪
        </button>
      </div>

      {/* Navegação por Abas */}
      <div className="flex bg-slate-800 p-1.5 rounded-2xl mb-6 border border-slate-700">
        <button
          onClick={() => { setActiveTab('targets'); setFeedbackMessage(''); }}
          className={`flex-1 py-3 font-black text-xs rounded-xl transition-all flex flex-col items-center gap-1 ${
            activeTab === 'targets'
              ? 'bg-yellow-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-lg">🎯</span>
          <span>1. Alvos ({selectedTargetIds.length})</span>
        </button>
        <button
          onClick={() => { setActiveTab('pins'); setFeedbackMessage(''); }}
          className={`flex-1 py-3 font-black text-xs rounded-xl transition-all flex flex-col items-center gap-1 ${
            activeTab === 'pins'
              ? 'bg-yellow-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-lg">🗝️</span>
          <span>2. PINs</span>
        </button>
        <button
          onClick={() => { setActiveTab('audit'); setFeedbackMessage(''); }}
          className={`flex-1 py-3 font-black text-xs rounded-xl transition-all flex flex-col items-center gap-1 ${
            activeTab === 'audit'
              ? 'bg-yellow-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="text-lg">📊</span>
          <span>3. Auditoria</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className="bg-green-500/20 text-green-300 font-bold p-3 rounded-2xl mb-6 text-center text-sm border border-green-500/30 animate-in fade-in duration-200">
          {feedbackMessage}
        </div>
      )}

      {/* --- ABA 1: SELECIONAR ALVOS --- */}
      {activeTab === 'targets' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 p-5 rounded-[2rem] border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-xl font-black text-yellow-300">Quem será votado? 🎯</h2>
                <p className="text-slate-400 text-xs font-bold">
                  Selecione os jogadores que vão aparecer na urna nesta rodada.
                </p>
              </div>
              <button
                onClick={toggleAllTargets}
                className="text-xs bg-slate-700 text-yellow-400 font-black px-3 py-1.5 rounded-xl hover:bg-slate-600 transition-colors"
              >
                {selectedTargetIds.length === allPlayers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>

            {loadingTargets ? (
              <div className="py-8 text-center text-slate-400 font-bold animate-pulse">
                Carregando jogadores... ⏳
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1 my-4">
                {allPlayers.map((player) => {
                  const isSelected = selectedTargetIds.includes(player.id);
                  return (
                    <div
                      key={player.id}
                      onClick={() => toggleTarget(player.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-yellow-500/10 border-yellow-500/50 text-white'
                          : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 font-black text-sm transition-colors ${
                            isSelected
                              ? 'bg-yellow-500 border-yellow-500 text-slate-950'
                              : 'border-slate-600'
                          }`}
                        >
                          {isSelected && '✓'}
                        </div>
                        <span className="font-black text-base">{player.name}</span>
                        {player.is_guest ? (
                          <span className="text-[10px] bg-orange-500/20 text-orange-300 font-bold px-2 py-0.5 rounded-md border border-orange-500/30">
                            Visitante 🧳
                          </span>
                        ) : (
                          <span className="text-[10px] bg-green-500/20 text-green-300 font-bold px-2 py-0.5 rounded-md border border-green-500/30">
                            Fixo 🤝
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        Rating: {player.skill_rating ? player.skill_rating.toFixed(1) : '5.0'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleSaveTargets}
              disabled={savingTargets}
              className="w-full bg-yellow-500 text-slate-950 font-black py-4 rounded-2xl text-lg hover:bg-yellow-400 active:scale-95 transition-all shadow-lg disabled:opacity-50 mt-2"
            >
              {savingTargets ? 'SALVANDO...' : `SALVAR LISTA DE ALVOS (${selectedTargetIds.length}) 🎯`}
            </button>
          </div>
        </div>
      )}

      {/* --- ABA 2: GERAR PINS E ACOMPANHAR --- */}
      {activeTab === 'pins' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 p-5 rounded-[2rem] border border-slate-700">
            <h2 className="text-xl font-black text-yellow-300 mb-1">Quem vai votar? 🔑</h2>
            <p className="text-slate-400 text-xs font-bold mb-4">
              Selecione os Fixos para gerar o PIN único de 24h e enviar o link por WhatsApp.
            </p>

            {loadingPins ? (
              <div className="py-8 text-center text-slate-400 font-bold animate-pulse">
                Buscando status de votação... ⏳
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1 my-4">
                {voters.map((voter) => {
                  const isSelected = selectedVoterIds.includes(voter.id);
                  return (
                    <div
                      key={voter.id}
                      className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => toggleVoter(voter.id)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 font-black text-sm transition-colors ${
                              isSelected
                                ? 'bg-yellow-500 border-yellow-500 text-slate-950'
                                : 'border-slate-600'
                            }`}
                          >
                            {isSelected && '✓'}
                          </div>
                          <span className="font-black text-base text-white">{voter.name}</span>
                        </div>

                        {/* Badge de Status */}
                        {voter.status === 'VOTED' && (
                          <span className="bg-green-500/20 text-green-400 font-black text-xs px-3 py-1 rounded-xl border border-green-500/30 flex items-center gap-1">
                            VOTOU ✅
                          </span>
                        )}
                        {voter.status === 'PENDING' && (
                          <span className="bg-amber-500/20 text-amber-300 font-black text-xs px-3 py-1 rounded-xl border border-amber-500/30 flex items-center gap-1">
                            PENDENTE ❌
                          </span>
                        )}
                        {voter.status === 'EXPIRED' && (
                          <span className="bg-red-500/20 text-red-400 font-black text-xs px-3 py-1 rounded-xl border border-red-500/30 flex items-center gap-1">
                            EXPIRADO ⏳
                          </span>
                        )}
                        {voter.status === 'NO_PIN' && (
                          <span className="bg-slate-700 text-slate-400 font-bold text-xs px-3 py-1 rounded-xl">
                            SEM PIN ⚪
                          </span>
                        )}
                      </div>

                      {/* Info do PIN & Botão Zap */}
                      {voter.pin && (
                        <div className="flex justify-between items-center pt-2 border-t border-slate-800 mt-1">
                          <div className="text-xs font-mono text-slate-400">
                            PIN: <span className="font-bold text-yellow-300 text-sm">{voter.pin}</span>
                          </div>
                          {voter.status !== 'VOTED' && (
                            <a
                              href={getWhatsappLink(voter)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-600 hover:bg-green-500 text-white font-black text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                            >
                              <span>Enviar Whats 📲</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleGeneratePins}
              disabled={generatingPins || selectedVoterIds.length === 0}
              className="w-full bg-yellow-500 text-slate-950 font-black py-4 rounded-2xl text-lg hover:bg-yellow-400 active:scale-95 transition-all shadow-lg disabled:opacity-50 mt-2"
            >
              {generatingPins ? 'GERANDO...' : `GERAR / RENOVAR PINS (24H) 🔑`}
            </button>
          </div>
        </div>
      )}

      {/* --- ABA 3: AUDITORIA (ESPIAR VOTOS) --- */}
      {activeTab === 'audit' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 p-5 rounded-[2rem] border border-slate-700">
            <h2 className="text-xl font-black text-yellow-300 mb-1">Auditoria de Votos 📊</h2>
            <p className="text-slate-400 text-xs font-bold mb-4">
              Histórico completo de votos computados no sistema.
            </p>

            {loadingAudit ? (
              <div className="py-8 text-center text-slate-400 font-bold animate-pulse">
                Buscando dados de auditoria... ⏳
              </div>
            ) : auditVotes.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-bold">
                Nenhum voto registrado ainda. 🤐
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                {auditVotes.map((vote) => (
                  <div
                    key={vote.id}
                    className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/60 flex items-center justify-between text-sm"
                  >
                    <div>
                      <div className="font-black text-white flex items-center gap-2">
                        <span>{vote.voter_name}</span>
                        <span className="text-slate-500 text-xs">➔</span>
                        <span className="text-yellow-300">{vote.target_name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {new Date(vote.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="bg-slate-800 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-xl font-black text-base">
                      {vote.score} ⭐
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

