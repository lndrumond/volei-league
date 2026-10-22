'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getStoredRole } from '@/lib/avlClient';
import { CHAMPION_NAME, CHALLENGER_NAME, teamNameWithCaptain } from '@/lib/teams';
import { drawTeams } from '@/lib/draw';

interface PlayerRow { id: string; name: string; is_guest: boolean; is_active?: boolean; skill_rating?: number; }
type Side = 'c' | 'h' | 'b'; // c = Sem Colete, h = Com Colete, b = banco de areia

const MAX_PER_TEAM = 7;

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const shortDate = () =>
  new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });

export default function Setup() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionHasTeams, setSessionHasTeams] = useState(false);
  const [isSwap, setIsSwap] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [desc, setDesc] = useState('');
  const [present, setPresent] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [assign, setAssign] = useState<Record<string, Side>>({});
  const [caps, setCaps] = useState<{ c: string | null; h: string | null }>({ c: null, h: null });
  const [sheetFor, setSheetFor] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [showAbort, setShowAbort] = useState(false);

  const nameOf = useMemo(() => {
    const m: Record<string, string> = {};
    players.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [players]);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };

  useEffect(() => {
    const admin = getStoredRole(slug) === 'admin';
    setIsAdmin(admin);
    if (!admin) { setReady(true); return; }

    (async () => {
      try {
        const [playRes, sessRes] = await Promise.all([
          apiFetch(slug, `/api/players/list?slug=${slug}`),
          apiFetch(slug, `/api/sessions/active?slug=${slug}`),
        ]);
        const playData = await playRes.json();
        const sessData = await sessRes.json();
        const all: PlayerRow[] = playData.players || [];
        setPlayers(all);
        const activeIds = new Set(all.filter((p) => p.is_active !== false).map((p) => p.id));

        const s = sessData.activeSession;
        if (s) {
          if ((sessData.sets || []).length > 0) {
            alert('Essa partida já tem set anotado. Para mudar os times, use Trocar Times no placar.');
            router.replace(`/g/${slug}/game`);
            return;
          }
          setSessionId(s.id);
          setSessionHasTeams(Boolean(s.champion_name));
          setPresent(Array.from(new Set<string>(s.present_player_ids || [])).filter((id) => activeIds.has(id)));
          setIsSwap(String(s.description || '').startsWith('Troca de time'));
        }
      } catch (e) {
        console.error(e);
        alert('Falha de conexão com a areia! Tente novamente.');
        router.replace(`/g/${slug}`);
        return;
      }
      setReady(true);
    })();
  }, [slug, router]);

  const skillOf = (id: string) => {
    const r = players.find((p) => p.id === id)?.skill_rating;
    return typeof r === 'number' ? r : 5;
  };

  // ---------- passo 1: presentes ----------
  const nq = norm(q);
  const sorted = players.filter((p) => p.is_active !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const visible = sorted.filter((p) => (nq ? norm(p.name).includes(nq) : !p.is_guest || present.includes(p.id)));
  const fixos = sorted.filter((p) => !p.is_guest);
  const fixosOn = fixos.filter((p) => present.includes(p.id)).length;
  const allFixos = fixos.length > 0 && fixosOn === fixos.length;
  const autoName = `${isSwap ? 'Troca de time' : 'Rodada'} · ${shortDate()}`;

  const togglePresent = (id: string) => {
    setPresent((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setQ('');
  };

  const toggleAllFixos = () => {
    const ids = fixos.map((p) => p.id);
    setPresent((prev) => (allFixos ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))));
  };

  const setGuest = async (p: PlayerRow, makeGuest: boolean) => {
    if (p.is_guest === makeGuest) return;
    try {
      const res = await apiFetch(slug, '/api/players/update', {
        method: 'PUT',
        body: JSON.stringify({ player_id: p.id, is_guest: makeGuest }),
      });
      if (!res.ok) throw new Error();
      setPlayers((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_guest: makeGuest } : x)));
      flash(`${p.name} agora é ${makeGuest ? 'visitante' : 'fixo'}`);
    } catch {
      alert('Erro ao mudar o status.');
    }
  };

  const addGuest = async () => {
    const name = q.trim();
    if (!name) return;
    setBusy(true);
    try {
      const res = await apiFetch(slug, '/api/players/add', {
        method: 'POST',
        body: JSON.stringify({ slug, name, is_guest: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.player) throw new Error(data.error);
      setPlayers((prev) => [...prev, data.player]);
      setPresent((prev) => [...prev, data.player.id]);
      setQ('');
      flash(`${data.player.name} cadastrado como visitante`);
    } catch {
      alert('Erro ao adicionar o visitante.');
    } finally {
      setBusy(false);
    }
  };

  const runDraw = (ids: string[]) => {
    const r = drawTeams(ids, skillOf);
    const next: Record<string, Side> = {};
    r.champion.forEach((id) => { next[id] = 'c'; });
    r.challenger.forEach((id) => { next[id] = 'h'; });
    r.bench.forEach((id) => { next[id] = 'b'; });
    setAssign(next);
    setCaps({
      c: r.champion[Math.floor(Math.random() * r.champion.length)] ?? null,
      h: r.challenger[Math.floor(Math.random() * r.challenger.length)] ?? null,
    });
    setSheetFor(null);
  };

  const goToTeams = async () => {
    if (present.length < 2) return;
    setBusy(true);
    try {
      let res: Response;
      if (!sessionId) {
        res = await apiFetch(slug, '/api/sessions/start', {
          method: 'POST',
          body: JSON.stringify({ slug, present_player_ids: present, description: desc.trim() || undefined }),
        });
      } else if (!sessionHasTeams) {
        res = await apiFetch(slug, '/api/sessions/update-presence', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId, present_player_ids: present }),
        });
      } else {
        res = new Response('{}', { status: 200 }); // times já gravados: os presentes vão junto no fim
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Erro ao salvar os presentes.');
        return;
      }
      if (data.session?.id) setSessionId(data.session.id);
      runDraw(present);
      setStep(2);
    } catch {
      alert('Erro ao salvar os presentes.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- passo 2: times ----------
  const inSide = (k: Side) => present.filter((id) => assign[id] === k);
  const champIds = inSide('c');
  const challIds = inSide('h');
  const benchIds = inSide('b');

  // O capitão é sempre alguém do time; se saiu, sorteia outro.
  const capOf = (k: 'c' | 'h', list: string[]) => {
    const cur = caps[k];
    return cur && list.includes(cur) ? cur : list.length ? list[0] : null;
  };
  const champCap = capOf('c', champIds);
  const challCap = capOf('h', challIds);

  const orderedWithCaptain = (list: string[], cap: string | null) =>
    cap ? [cap, ...list.filter((id) => id !== cap)] : list;

  const moveTo = (id: string, to: Side) => {
    if ((to === 'c' && champIds.length >= MAX_PER_TEAM) || (to === 'h' && challIds.length >= MAX_PER_TEAM)) {
      flash('Time cheio: no máximo 7 jogadores');
      return;
    }
    setAssign((prev) => ({ ...prev, [id]: to }));
    setSheetFor(null);
  };

  const startMatch = async () => {
    if (!sessionId || champIds.length === 0 || challIds.length === 0) return;
    setBusy(true);
    try {
      const res = await apiFetch(slug, '/api/sessions/setup-teams', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          champion_name: teamNameWithCaptain(CHAMPION_NAME, champCap ? nameOf[champCap] : null),
          challenger_name: teamNameWithCaptain(CHALLENGER_NAME, challCap ? nameOf[challCap] : null),
          champion_player_ids: champIds,
          challenger_player_ids: challIds,
          present_player_ids: present,
          description: desc.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Deu ruim ao salvar os times!');
        return;
      }
      router.push(`/g/${slug}/game`);
    } catch {
      alert('Deu ruim ao salvar os times!');
    } finally {
      setBusy(false);
    }
  };

  const abort = async () => {
    setBusy(true);
    try {
      if (sessionId) {
        const res = await apiFetch(slug, '/api/sessions/end', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Erro ao fechar a quadra.');
          setBusy(false);
          return;
        }
      }
      router.push(`/g/${slug}`);
    } catch {
      alert('Erro ao fechar a quadra.');
      setBusy(false);
    }
  };

  // ---------- telas ----------
  if (!ready) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-orange-800 font-black text-3xl animate-pulse mb-6">Pintando as linhas da quadra...</h2>
        <span className="text-6xl animate-bounce">🏐</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-orange-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border-b-8 border-orange-200 max-w-sm">
          <div className="text-6xl mb-2" aria-hidden="true">🔒</div>
          <h1 className="text-2xl font-black text-orange-900">Só para o admin</h1>
          <p className="text-gray-500 font-bold mt-2">A prancheta de times é do admin. Você acompanha o jogo pelas outras abas.</p>
          <button onClick={() => router.push(`/g/${slug}`)} className="mt-5 w-full bg-orange-500 text-white text-lg font-black py-3 rounded-2xl border-b-4 border-orange-700">Voltar</button>
        </div>
      </div>
    );
  }

  const row = (id: string, cap: boolean, label?: string) => (
    <li key={id}>
      <button
        onClick={() => setSheetFor(id)}
        aria-label={`${nameOf[id]}: trocar de time ou mandar para o banco`}
        className="w-full flex items-center justify-between gap-2 py-3 px-2 min-h-12 font-bold text-gray-800 text-left border-b border-gray-100"
      >
        <span>{nameOf[id]}{cap && <span className="ml-1 text-[10px] font-black text-orange-500 uppercase">cap.</span>}{label}</span>
        <span aria-hidden="true" className="text-gray-400">⇄</span>
      </button>
    </li>
  );

  const sheetSide = sheetFor ? assign[sheetFor] : null;
  const whereText = sheetSide === 'c' ? 'no Sem Colete' : sheetSide === 'h' ? 'no Com Colete' : 'no banco de areia';

  return (
    <div className="min-h-screen bg-orange-50 p-4 pb-24 max-w-md mx-auto font-sans relative flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <button onClick={() => router.push(`/g/${slug}`)} className="text-orange-800 font-black flex items-center gap-2 py-2">
          <span>◀</span> Sair
        </button>
        <button onClick={() => setShowAbort(true)} className="text-red-500 bg-red-100 px-3 py-2 rounded-xl font-black text-sm border-b-4 border-red-200 active:translate-y-1 transition-all">
          🛑 Abortar
        </button>
      </div>

      <h1 className="text-3xl font-black text-orange-900 text-center leading-tight">
        Tirando os <span className="text-orange-500">Times</span> 🤼
      </h1>

      {isSwap && step === 1 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-3 text-blue-900 font-bold text-sm">
          <b>Trocar Times.</b> A partida anterior já foi encerrada com os sets ganhos. Ajuste os presentes e monte os times de novo.
        </div>
      )}

      {step === 1 && (
        <>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border-b-8 border-orange-200">
            <label htmlFor="desc" className="font-black text-orange-800 text-sm">Nome da rodada (opcional)</label>
            <input
              id="desc" type="text" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={80}
              placeholder={autoName} autoComplete="off"
              className="mt-2 w-full bg-gray-50 border-4 border-gray-100 rounded-2xl p-3 font-bold text-gray-700 outline-none focus:border-orange-500"
            />
            <p className="text-gray-500 font-bold text-xs mt-2">Em branco, usamos “{autoName}”.</p>
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-sm border-b-8 border-orange-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-orange-800 text-lg">Quem está na areia?</h2>
              <span className="bg-orange-100 text-orange-700 font-black text-sm px-3 py-1 rounded-full">
                {present.length} {present.length === 1 ? 'presente' : 'presentes'}
              </span>
            </div>
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
              placeholder="Buscar jogador pelo nome" aria-label="Buscar jogador pelo nome"
              className="w-full bg-gray-50 border-4 border-gray-100 rounded-2xl p-3 font-bold text-gray-700 outline-none focus:border-orange-500 mb-2"
            />

            {!nq && fixos.length > 0 && (
              <button onClick={toggleAllFixos} aria-pressed={allFixos} className="w-full flex items-center gap-3 py-3 px-2 min-h-12 font-black text-gray-800 border-b border-gray-100 text-left">
                <span className={`w-7 h-7 rounded-lg border-4 flex items-center justify-center text-sm ${allFixos ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`} aria-hidden="true">
                  {allFixos ? '✓' : fixosOn ? '–' : ''}
                </span>
                Selecionar todos os fixos
              </button>
            )}

            <ul>
              {visible.map((p) => {
                const on = present.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2 border-b border-gray-100">
                    <button onClick={() => togglePresent(p.id)} aria-pressed={on} className="flex-1 flex items-center gap-3 py-3 px-2 min-h-12 font-bold text-gray-800 text-left">
                      <span className={`w-7 h-7 rounded-lg border-4 flex items-center justify-center text-sm shrink-0 ${on ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`} aria-hidden="true">{on ? '✓' : ''}</span>
                      {p.name}
                    </button>
                    <div role="group" aria-label={`Cadastro de ${p.name}`} className="flex rounded-xl overflow-hidden border-2 border-gray-200 text-xs font-black shrink-0">
                      <button onClick={() => setGuest(p, false)} aria-pressed={!p.is_guest} className={`px-2 py-2 ${!p.is_guest ? 'bg-green-500 text-white' : 'bg-white text-gray-500'}`}>Fixo</button>
                      <button onClick={() => setGuest(p, true)} aria-pressed={p.is_guest} className={`px-2 py-2 ${p.is_guest ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}>Visitante</button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {visible.length === 0 && nq && <p className="text-gray-500 font-bold text-sm mt-2">Ninguém com esse nome no cadastro.</p>}
            {nq && !sorted.some((p) => norm(p.name) === nq) && (
              <button onClick={addGuest} disabled={busy} className="mt-3 w-full bg-yellow-300 text-yellow-900 font-black py-3 rounded-2xl border-b-4 border-yellow-500 active:translate-y-1 active:border-b-0 disabled:opacity-50">
                + Adicionar “{q.trim()}” como visitante
              </button>
            )}
            {!nq && <p className="text-gray-500 font-bold text-xs mt-3">Visitante? Digite o nome na busca.</p>}
          </div>

          <button onClick={goToTeams} disabled={present.length < 2 || busy} className="w-full bg-yellow-400 text-yellow-900 text-2xl font-black py-5 rounded-2xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50">
            {busy ? 'Salvando...' : 'Montar times'}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm border-b-8 border-orange-200">
            <h2 className="font-black text-orange-800 text-lg">Banco de areia ({benchIds.length})</h2>
            <p className="text-gray-500 font-bold text-sm">Quem fica de fora desta partida.</p>
            {benchIds.length ? <ul className="mt-2">{benchIds.map((id) => row(id, false))}</ul> : <p className="font-black text-gray-700 mt-2">Ninguém de fora.</p>}
          </div>

          <div className="bg-white p-5 rounded-[2rem] shadow-sm border-b-8 border-orange-200">
            <h2 className="font-black text-orange-800 text-lg">Times sorteados</h2>
            <p className="text-gray-500 font-bold text-sm">Toque no nome de um jogador para trocar de time ou mandar para o banco.</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <h3 className="font-black text-green-700">{CHAMPION_NAME}</h3>
                <ul>{orderedWithCaptain(champIds, champCap).map((id) => row(id, id === champCap))}</ul>
              </div>
              <div>
                <h3 className="font-black text-orange-600">{CHALLENGER_NAME}</h3>
                <ul>{orderedWithCaptain(challIds, challCap).map((id) => row(id, id === challCap))}</ul>
              </div>
            </div>
            <div className="flex gap-4 mt-3 font-black text-sm text-gray-700">
              <span>{CHAMPION_NAME} {champIds.length}</span>
              <span>{CHALLENGER_NAME} {challIds.length}</span>
            </div>
            <p className="text-gray-500 font-bold text-xs mt-2">O sorteio coloca até 6 por time. À mão cabem até 7.</p>
            <button onClick={() => runDraw(present)} className="mt-3 w-full bg-gray-100 text-gray-700 font-black py-3 rounded-2xl border-b-4 border-gray-300 active:translate-y-1 active:border-b-0">
              Sortear de novo
            </button>
          </div>

          <button onClick={startMatch} disabled={busy || champIds.length === 0 || challIds.length === 0} className="w-full bg-yellow-400 text-yellow-900 text-2xl font-black py-5 rounded-2xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50">
            {busy ? 'Salvando...' : 'BOLA PRO ALTO!'}
          </button>
          <button onClick={() => setStep(1)} className="w-full text-orange-800 font-black py-2">Voltar aos presentes</button>
        </>
      )}

      <p className="text-gray-500 font-bold text-xs text-center">Abortar encerra a rodada toda, sem gravar nada.</p>

      {/* Janela para mover jogador */}
      {sheetFor && sheetSide && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={() => setSheetFor(null)}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="bg-white rounded-t-[2rem] p-6 w-full max-w-md flex flex-col gap-3">
            <h3 className="text-2xl font-black text-gray-800">{nameOf[sheetFor]}</h3>
            <p className="text-gray-500 font-bold">Está {whereText}. O que você quer fazer?</p>
            {sheetSide !== 'c' && (
              <button onClick={() => moveTo(sheetFor, 'c')} disabled={champIds.length >= MAX_PER_TEAM} className="bg-green-500 text-white text-lg font-black py-4 rounded-2xl border-b-4 border-green-700 disabled:opacity-40">
                {sheetSide === 'b' ? 'Colocar no' : 'Passar para o'} {CHAMPION_NAME}
              </button>
            )}
            {sheetSide !== 'h' && (
              <button onClick={() => moveTo(sheetFor, 'h')} disabled={challIds.length >= MAX_PER_TEAM} className="bg-orange-500 text-white text-lg font-black py-4 rounded-2xl border-b-4 border-orange-700 disabled:opacity-40">
                {sheetSide === 'b' ? 'Colocar no' : 'Passar para o'} {CHALLENGER_NAME}
              </button>
            )}
            {sheetSide !== 'b' && (
              <button onClick={() => moveTo(sheetFor, 'b')} className="bg-gray-100 text-gray-700 text-lg font-black py-4 rounded-2xl border-b-4 border-gray-300">
                Mandar para o banco de areia
              </button>
            )}
            {(champIds.length >= MAX_PER_TEAM || challIds.length >= MAX_PER_TEAM) && (
              <p className="text-gray-500 font-bold text-xs">Um time cheio (7 jogadores) não aceita mais ninguém.</p>
            )}
            <button onClick={() => setSheetFor(null)} className="text-gray-500 font-black py-2">Voltar</button>
          </div>
        </div>
      )}

      {showAbort && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm text-center">
            <div className="text-5xl mb-2" aria-hidden="true">🛑</div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Abortar a rodada?</h2>
            <p className="text-gray-500 font-bold mb-5">Isso encerra a rodada toda, sem gravar nada.</p>
            <div className="flex flex-col gap-3">
              <button onClick={abort} disabled={busy} className="bg-red-500 text-white text-xl font-black py-4 rounded-2xl border-b-8 border-red-700 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50">Abortar</button>
              <button onClick={() => setShowAbort(false)} className="bg-gray-100 text-gray-600 text-lg font-black py-3 rounded-2xl">Voltar</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-bold px-4 py-2 rounded-full z-50 text-sm">{toast}</div>
      )}
    </div>
  );
}
