'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { saveAuth } from '@/lib/avlClient';
import { Button, Card, Chip, Sub, useToast } from '@/components/ui';
import AppHeader from '@/components/AppHeader';

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
  const toast = useToast();

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
        toast.error(data.error || 'Erro ao salvar alvos.');
      }
    } catch (e) {
      toast.error('Erro de conexão ao salvar alvos.');
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
    if (selectedVoterIds.length === 0) return toast.error('Selecione pelo menos um jogador Fixo.');
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
        toast.error(data.error || 'Erro ao gerar PINs.');
      }
    } catch (e) {
      toast.error('Erro de conexão.');
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

  const CHECK = (on: boolean) => (
    <span aria-hidden="true" className={`w-7 h-7 shrink-0 grid place-items-center rounded-[9px] border-[3px] border-line font-extrabold ${on ? 'bg-sea text-sea-ink' : 'bg-surface'}`}>{on ? '✓' : ''}</span>
  );

  const shell = (children: React.ReactNode, right?: React.ReactNode) => (
    <div className="min-h-screen bg-bg text-ink p-4 pb-16 max-w-lg mx-auto flex flex-col gap-3">
      <AppHeader title="Super Admin" right={right} />
      {children}
    </div>
  );

  // --- TELA DE LOGIN ---
  if (!authenticated) {
    return shell(
      <Card>
        <div className="text-center">
          <div className="text-5xl" aria-hidden="true">🕵️</div>
          <h1 className="text-2xl font-bold mt-1">Super Admin</h1>
          <Sub className="mt-1">Gestão secreta do rating AVL</Sub>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <label htmlFor="sapw" className="sr-only">Senha mestra</label>
          <input
            id="sapw"
            type="password"
            placeholder="Senha mestra"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface2 text-ink border-[3px] border-line rounded-[14px] px-3 py-3 min-h-14 text-center text-xl font-bold"
            autoFocus
          />
          {authError && <p role="alert" className="font-bold text-danger text-center">{authError}</p>}
          <Button type="submit" variant="sun">Entrar no painel 🔐</Button>
        </form>
        <Button size="sm" onClick={() => router.push(`/g/${slug}`)}>Voltar para a liga</Button>
      </Card>,
    );
  }

  // --- PAINEL PRINCIPAL ---
  return shell(
    <>
      <div className="flex items-center justify-between gap-2">
        <Sub className="uppercase tracking-wider font-bold">Liga: {slug}</Sub>
        <Button
          size="sm"
          inline
          onClick={() => { sessionStorage.removeItem(`superadmin_${slug}`); setAuthenticated(false); }}
        >
          Sair
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Seções">
        <Chip pressed={activeTab === 'targets'} onClick={() => { setActiveTab('targets'); setFeedbackMessage(''); }}>🎯 1. Alvos ({selectedTargetIds.length})</Chip>
        <Chip pressed={activeTab === 'pins'} onClick={() => { setActiveTab('pins'); setFeedbackMessage(''); }}>🗝️ 2. PINs</Chip>
        <Chip pressed={activeTab === 'audit'} onClick={() => { setActiveTab('audit'); setFeedbackMessage(''); }}>📊 3. Auditoria</Chip>
      </div>

      {feedbackMessage && (
        <p role="status" className="bg-surface border-[3px] border-line rounded-[16px] px-4 py-3 font-bold text-center text-ok">{feedbackMessage}</p>
      )}

      {/* --- ABA 1: SELECIONAR ALVOS --- */}
      {activeTab === 'targets' && (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Quem será votado? 🎯</h2>
              <Sub>Selecione os jogadores que vão aparecer na urna nesta rodada.</Sub>
            </div>
            <Button size="sm" inline onClick={toggleAllTargets}>{selectedTargetIds.length === allPlayers.length ? 'Desmarcar todos' : 'Marcar todos'}</Button>
          </div>

          {loadingTargets ? (
            <Sub className="py-6 text-center animate-pulse">Carregando jogadores... ⏳</Sub>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {allPlayers.map((player) => {
                const isSelected = selectedTargetIds.includes(player.id);
                return (
                  <li key={player.id} className="border-b border-soft">
                    <button type="button" onClick={() => toggleTarget(player.id)} aria-pressed={isSelected} className="w-full flex items-center gap-2.5 min-h-12 py-1 text-left">
                      {CHECK(isSelected)}
                      <span className="flex-1 min-w-0 font-extrabold truncate">
                        {player.name}
                        <span className="ml-2 text-[13px] font-bold text-muted">{player.is_guest ? 'visitante' : 'fixo'}</span>
                      </span>
                      <span className="text-xs font-bold text-muted tabular-nums">Rating {player.skill_rating ? player.skill_rating.toFixed(1) : '5.0'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Button variant="sun" onClick={handleSaveTargets} disabled={savingTargets}>{savingTargets ? 'Salvando...' : `Salvar lista de alvos (${selectedTargetIds.length}) 🎯`}</Button>
        </Card>
      )}

      {/* --- ABA 2: GERAR PINS E ACOMPANHAR --- */}
      {activeTab === 'pins' && (
        <Card>
          <h2 className="text-xl font-bold">Quem vai votar? 🔑</h2>
          <Sub>Selecione os fixos para gerar o PIN único de 24h e enviar o link por WhatsApp.</Sub>

          {loadingPins ? (
            <Sub className="py-6 text-center animate-pulse">Buscando status de votação... ⏳</Sub>
          ) : (
            <ul className="max-h-96 overflow-y-auto flex flex-col gap-2">
              {voters.map((voter) => {
                const isSelected = selectedVoterIds.includes(voter.id);
                const badge =
                  voter.status === 'VOTED' ? { t: 'VOTOU ✅', c: 'bg-ok text-white' }
                  : voter.status === 'PENDING' ? { t: 'PENDENTE', c: 'bg-sun text-sun-ink' }
                  : voter.status === 'EXPIRED' ? { t: 'EXPIRADO ⏳', c: 'bg-danger text-danger-ink' }
                  : { t: 'SEM PIN', c: 'bg-surface2 text-muted' };
                return (
                  <li key={voter.id} className="bg-surface2 border-2 border-soft rounded-[16px] px-3 py-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => toggleVoter(voter.id)} aria-pressed={isSelected} className="flex-1 min-w-0 flex items-center gap-2.5 min-h-11 text-left">
                        {CHECK(isSelected)}
                        <span className="font-extrabold truncate">{voter.name}</span>
                      </button>
                      <span className={`font-extrabold text-xs px-2.5 py-1 rounded-full border-2 border-line shrink-0 ${badge.c}`}>{badge.t}</span>
                    </div>
                    {voter.pin && (
                      <div className="flex items-center justify-between gap-2 border-t border-soft pt-1.5">
                        <span className="text-sm text-muted">PIN: <b className="font-display text-ink text-base tracking-widest">{voter.pin}</b></span>
                        {voter.status !== 'VOTED' && (
                          <a
                            href={getWhatsappLink(voter)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-ok text-white font-extrabold text-sm px-3 py-2 min-h-10 rounded-[12px] border-2 border-line inline-flex items-center"
                          >
                            Enviar Whats 📲
                          </a>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Button variant="sun" onClick={handleGeneratePins} disabled={generatingPins || selectedVoterIds.length === 0}>{generatingPins ? 'Gerando...' : 'Gerar / renovar PINs (24h) 🔑'}</Button>
        </Card>
      )}

      {/* --- ABA 3: AUDITORIA (ESPIAR VOTOS) --- */}
      {activeTab === 'audit' && (
        <Card>
          <h2 className="text-xl font-bold">Auditoria de votos 📊</h2>
          <Sub>Histórico completo de votos computados no sistema.</Sub>

          {loadingAudit ? (
            <Sub className="py-6 text-center animate-pulse">Buscando dados de auditoria... ⏳</Sub>
          ) : auditVotes.length === 0 ? (
            <Sub className="py-8 text-center font-bold">Nenhum voto registrado ainda. 🤐</Sub>
          ) : (
            <ul className="max-h-96 overflow-y-auto flex flex-col gap-2">
              {auditVotes.map((vote) => (
                <li key={vote.id} className="bg-surface2 border-2 border-soft rounded-[16px] px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold truncate">{vote.voter_name} <span className="text-muted">➔</span> {vote.target_name}</div>
                    <div className="text-[11px] text-muted font-bold">{new Date(vote.created_at).toLocaleString('pt-BR')}</div>
                  </div>
                  <span className="bg-sun text-sun-ink border-2 border-line font-display font-bold px-2.5 py-1 rounded-[12px] shrink-0">{vote.score} ⭐</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>,
  );
}
