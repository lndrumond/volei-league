'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getStoredRole } from '@/lib/avlClient';
import { CHAMPION_NAME, CHALLENGER_NAME, teamNameWithCaptain } from '@/lib/teams';
import { drawTeams } from '@/lib/draw';
import { Button, Card, ConfirmModal, EmptyState, Eyebrow, Modal, PlayerChip, Sub, TeamDot, useToast } from '@/components/ui';
import type { ChipSide } from '@/components/ui';
import AppHeader from '@/components/AppHeader';

interface PlayerRow { id: string; name: string; is_guest: boolean; is_active?: boolean; skill_rating?: number; }
type Side = 'c' | 'h' | 'b'; // c = Sem Colete, h = Com Colete, b = banco de areia

const MAX_PER_TEAM = 7;
const FIELD = 'w-full bg-surface2 text-ink border-[3px] border-line rounded-[14px] px-3 py-2.5 min-h-12 font-bold placeholder:text-muted placeholder:font-semibold';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const shortDate = () =>
  new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });

export default function Setup() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const toast = useToast();

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
  const [showAbort, setShowAbort] = useState(false);

  const nameOf = useMemo(() => {
    const m: Record<string, string> = {};
    players.forEach((p) => { m[p.id] = p.name; });
    return m;
  }, [players]);

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
            toast.error('Essa partida já tem set anotado. Para mudar os times, use Trocar Times no placar.');
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
        toast.error('Falha de conexão com a areia! Tente novamente.');
        router.replace(`/g/${slug}`);
        return;
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.show(`${p.name} agora é ${makeGuest ? 'visitante' : 'fixo'}`);
    } catch {
      toast.error('Erro ao mudar o status.');
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
      toast.show(`${data.player.name} cadastrado como visitante`);
    } catch {
      toast.error('Erro ao adicionar o visitante.');
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
        toast.error(data.error || 'Erro ao salvar os presentes.');
        return;
      }
      if (data.session?.id) setSessionId(data.session.id);
      runDraw(present);
      setStep(2);
    } catch {
      toast.error('Erro ao salvar os presentes.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- passo 2: times ----------
  const inSide = (k: Side) => present.filter((id) => assign[id] === k);
  const champIds = inSide('c');
  const challIds = inSide('h');
  const benchIds = inSide('b');

  // O capitão é sempre alguém do time; se saiu, vale o primeiro da lista.
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
      toast.show('Time cheio: no máximo 7 jogadores');
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
        toast.error(data.error || 'Deu ruim ao salvar os times!');
        return;
      }
      router.push(`/g/${slug}/game`);
    } catch {
      toast.error('Deu ruim ao salvar os times!');
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
          toast.error(data.error || 'Erro ao fechar a quadra.');
          setBusy(false);
          return;
        }
      }
      router.push(`/g/${slug}`);
    } catch {
      toast.error('Erro ao fechar a quadra.');
      setBusy(false);
    }
  };

  // ---------- telas ----------
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-bg text-ink p-4 pb-10 max-w-md mx-auto flex flex-col gap-3">
      <AppHeader
        title="Prancheta"
        pageHeading
        right={<Button size="sm" inline onClick={() => router.push(`/g/${slug}`)} className="!min-h-9 !px-3 !py-1 !text-sm text-ink">Sair</Button>}
      />
      {children}
    </div>
  );

  if (!ready) {
    return shell(
      <div className="text-center py-16">
        <div className="text-6xl animate-bounce" aria-hidden="true">🏐</div>
        <p className="font-display font-bold text-xl mt-3">Pintando as linhas da quadra...</p>
      </div>,
    );
  }

  if (!isAdmin) {
    return shell(
      <EmptyState
        icon="🔒"
        title="Só para o admin"
        text="A prancheta de times é do admin. Você acompanha o jogo pelas outras abas."
        action={<Button variant="sun" onClick={() => router.push(`/g/${slug}`)}>Voltar ao Dashboard</Button>}
      />,
    );
  }

  const teamRow = (id: string, cap: boolean, side: ChipSide) => (
    <li key={id}>
      <PlayerChip name={nameOf[id] || 'Jogador'} captain={cap} side={side} onClick={() => setSheetFor(id)} ariaLabel={`${nameOf[id]}: trocar de time ou mandar para o banco`} />
    </li>
  );

  const sheetSide = sheetFor ? assign[sheetFor] : null;
  const whereText = sheetSide === 'c' ? 'no Sem Colete' : sheetSide === 'h' ? 'no Com Colete' : 'no banco de areia';
  const champFull = champIds.length >= MAX_PER_TEAM;
  const challFull = challIds.length >= MAX_PER_TEAM;

  return shell(
    <>
      {isSwap && step === 1 && (
        <p className="bg-surface border-2 border-soft rounded-[16px] px-3.5 py-3 text-muted text-sm">
          <b className="text-ink">Trocar Times.</b> A partida anterior já foi encerrada com os sets ganhos. Ajuste os presentes e monte os times de novo.
        </p>
      )}

      {step === 1 && (
        <>
          <Card slim>
            <label htmlFor="desc"><Eyebrow>Nome da rodada (opcional)</Eyebrow></label>
            <input id="desc" type="text" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={80} placeholder={autoName} autoComplete="off" className={FIELD} />
            <Sub>Em branco, usamos “{autoName}”.</Sub>
          </Card>

          <Card slim>
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-lg font-bold">Quem está na areia?</h2>
              <span className="font-extrabold text-[13px] bg-sun text-sun-ink border-2 border-line rounded-full px-3 py-0.5">
                {present.length} {present.length === 1 ? 'presente' : 'presentes'}
              </span>
            </div>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder="Buscar jogador pelo nome" aria-label="Buscar jogador pelo nome" className={FIELD} />

            <ul>
              {!nq && fixos.length > 0 && (
                <li className="flex items-center border-b border-soft">
                  <button type="button" onClick={toggleAllFixos} aria-pressed={allFixos} className="flex-1 flex items-center gap-2.5 min-h-12 py-1 text-left font-extrabold">
                    <span aria-hidden="true" className={`w-7 h-7 shrink-0 grid place-items-center rounded-[9px] border-[3px] border-line font-extrabold ${allFixos || fixosOn ? 'bg-sea text-sea-ink' : 'bg-surface'}`}>
                      {allFixos ? '✓' : fixosOn ? '–' : ''}
                    </span>
                    Selecionar todos os fixos
                  </button>
                </li>
              )}
              {visible.map((p) => {
                const on = present.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-2 border-b border-soft">
                    <button type="button" onClick={() => togglePresent(p.id)} aria-pressed={on} className="flex-1 min-w-0 flex items-center gap-2.5 min-h-12 py-1 text-left font-extrabold">
                      <span aria-hidden="true" className={`w-7 h-7 shrink-0 grid place-items-center rounded-[9px] border-[3px] border-line font-extrabold ${on ? 'bg-sea text-sea-ink' : 'bg-surface'}`}>{on ? '✓' : ''}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                    <div role="group" aria-label={`Cadastro de ${p.name}`} className="flex shrink-0 rounded-[12px] overflow-hidden border-2 border-line text-xs font-extrabold">
                      <button type="button" onClick={() => setGuest(p, false)} aria-pressed={!p.is_guest} className={`min-h-10 px-2.5 ${!p.is_guest ? 'bg-sun text-sun-ink' : 'bg-surface text-muted'}`}>Fixo</button>
                      <button type="button" onClick={() => setGuest(p, true)} aria-pressed={p.is_guest} className={`min-h-10 px-2.5 border-l-2 border-line ${p.is_guest ? 'bg-sun text-sun-ink' : 'bg-surface text-muted'}`}>Visitante</button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {visible.length === 0 && nq && <Sub>Ninguém com esse nome no cadastro.</Sub>}
            {nq && !sorted.some((p) => norm(p.name) === nq) && (
              <Button size="sm" variant="sun" onClick={addGuest} disabled={busy}>+ Adicionar “{q.trim()}” como visitante</Button>
            )}
            {!nq && <Sub>Visitante? Digite o nome na busca.</Sub>}
          </Card>

          <Button variant="sun" onClick={goToTeams} disabled={present.length < 2 || busy}>{busy ? 'Salvando...' : 'Montar times'}</Button>
        </>
      )}

      {step === 2 && (
        <>
          <Card slim>
            <h2 className="text-lg font-bold">Banco de areia ({benchIds.length})</h2>
            <Sub>Quem fica de fora desta partida.</Sub>
            {benchIds.length ? (
              <ul className="grid grid-cols-2 gap-2">{benchIds.map((id) => teamRow(id, false, 'bench'))}</ul>
            ) : (
              <p className="font-extrabold">Ninguém de fora.</p>
            )}
          </Card>

          <Card slim>
            <h2 className="text-lg font-bold">Times sorteados</h2>
            <Sub>Toque no nome de um jogador para trocar de time ou mandar para o banco.</Sub>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[15px] mb-1.5"><TeamDot side="champion" />{CHAMPION_NAME}</h3>
                <ul className="flex flex-col gap-1.5">{orderedWithCaptain(champIds, champCap).map((id) => teamRow(id, id === champCap, 'champion'))}</ul>
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[15px] mb-1.5"><TeamDot side="challenger" />{CHALLENGER_NAME}</h3>
                <ul className="flex flex-col gap-1.5">{orderedWithCaptain(challIds, challCap).map((id) => teamRow(id, id === challCap, 'challenger'))}</ul>
              </div>
            </div>
            <div className="flex gap-4 font-extrabold text-sm">
              <span><TeamDot side="champion" />{CHAMPION_NAME} {champIds.length}</span>
              <span><TeamDot side="challenger" />{CHALLENGER_NAME} {challIds.length}</span>
            </div>
            <Sub>O sorteio coloca até 6 por time. À mão cabem até 7.</Sub>
            <Button size="sm" onClick={() => runDraw(present)}>Sortear de novo</Button>
          </Card>

          <Button variant="sun" onClick={startMatch} disabled={busy || champIds.length === 0 || challIds.length === 0}>{busy ? 'Salvando...' : 'BOLA PRO ALTO!'}</Button>
          <Button size="sm" onClick={() => setStep(1)}>Voltar aos presentes</Button>
        </>
      )}

      <Button size="sm" variant="danger" onClick={() => setShowAbort(true)}>Abortar</Button>
      <Sub className="text-center">Abortar encerra a rodada toda, sem gravar nada.</Sub>

      {/* Janela para mover jogador */}
      <Modal open={Boolean(sheetFor && sheetSide)} onClose={() => setSheetFor(null)} title={sheetFor ? nameOf[sheetFor] || '' : ''}>
        {sheetFor && sheetSide && (
          <>
            <p className="text-muted">Está {whereText}. O que você quer fazer?</p>
            {sheetSide !== 'c' && (
              <>
                <Button variant="sea" onClick={() => moveTo(sheetFor, 'c')} disabled={champFull}><span aria-hidden="true">◀ </span>{sheetSide === 'b' ? 'Colocar no' : 'Passar para o'} {CHAMPION_NAME}</Button>
                {champFull && <Sub className="text-center -mt-1">{CHAMPION_NAME} está cheio (7 jogadores).</Sub>}
              </>
            )}
            {sheetSide !== 'h' && (
              <>
                <Button variant="vest" onClick={() => moveTo(sheetFor, 'h')} disabled={challFull}>{sheetSide === 'b' ? 'Colocar no' : 'Passar para o'} {CHALLENGER_NAME}<span aria-hidden="true"> ▶</span></Button>
                {challFull && <Sub className="text-center -mt-1">{CHALLENGER_NAME} está cheio (7 jogadores).</Sub>}
              </>
            )}
            {sheetSide !== 'b' && (
              <>
                <Button onClick={() => moveTo(sheetFor, 'b')}><span aria-hidden="true">▲ </span>Mandar para o banco de areia</Button>
                <Sub className="text-center -mt-1">O banco de areia é quem fica de fora desta partida.</Sub>
              </>
            )}
            <Button size="sm" onClick={() => setSheetFor(null)}>Voltar</Button>
          </>
        )}
      </Modal>

      <ConfirmModal
        open={showAbort}
        danger
        title="Abortar a rodada?"
        text="Isso encerra a rodada toda, sem gravar nada."
        confirmLabel="Abortar"
        busy={busy}
        onConfirm={abort}
        onClose={() => setShowAbort(false)}
      />
    </>,
  );
}
