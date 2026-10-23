'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, PinModal, useAVLAuth, clearAuth } from '@/lib/avlClient';
import { lineupNames, countSets } from '@/lib/teams';
import { MEDALS, top5 } from '@/lib/ranking';
import { addMonths, currentMonthKey, monthName } from '@/lib/brMonth';
import { Button, Card, Chip, Eyebrow, Lineup, Scoreboard, Sub, useToast } from '@/components/ui';
import AppHeader, { AdminTag } from '@/components/AppHeader';

interface RankingItem { name: string; points: number; is_guest?: boolean; }
interface SessionRow {
  id: string;
  champion_name?: string | null;
  challenger_name?: string | null;
  champion_player_ids?: string[];
  challenger_player_ids?: string[];
  created_at?: string;
  ended_at?: string | null;
}

const MEDAL_BG = ['bg-gold', 'bg-silver', 'bg-bronze'];

export default function Dashboard() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const toast = useToast();
  const { role, refreshAuth } = useAVLAuth(slug);

  const [activeSession, setActiveSession] = useState<SessionRow | null>(null);
  const [lastEndedSession, setLastEndedSession] = useState<SessionRow | null>(null);
  const [sessionSets, setSessionSets] = useState<{ winner: string }[]>([]);
  const [lastSets, setLastSets] = useState<{ winner: string }[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [lastMonthChamps, setLastMonthChamps] = useState<{ points: number; champions: { name: string }[] } | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [pinOpen, setPinOpen] = useState(false);
  const [afterPin, setAfterPin] = useState<() => void>(() => () => {});

  const isAdmin = role === 'admin';

  const loadData = useCallback(async () => {
    try {
      const [sessRes, rankRes, playRes, champRes] = await Promise.all([
        apiFetch(slug, `/api/sessions/active?slug=${slug}`),
        apiFetch(slug, `/api/rankings?slug=${slug}&period=month`).catch(() => null),
        apiFetch(slug, `/api/players/list?slug=${slug}`).catch(() => null),
        apiFetch(slug, `/api/rankings/champions?slug=${slug}`).catch(() => null),
      ]);

      if (playRes && playRes.ok) {
        const playData = await playRes.json();
        const pMap: Record<string, string> = {};
        playData.players?.forEach((p: { id: string; name: string }) => { pMap[p.id] = p.name; });
        setPlayersMap(pMap);
      }
      if (sessRes && sessRes.ok) {
        const sessData = await sessRes.json();
        setActiveSession(sessData.activeSession || null);
        setLastEndedSession(sessData.lastEndedSession || null);
        setSessionSets(sessData.activeSession ? sessData.sets || [] : []);
        setLastSets(sessData.lastSets || []);
      }
      if (champRes && champRes.ok) {
        const champData = await champRes.json();
        // Honraria: campeão do mês passado (aparece já no dia 1º, horário de Brasília)
        const prev = addMonths(currentMonthKey(), -1);
        setLastMonthChamps((champData.champions || []).find((c: { month: string }) => c.month === prev) || null);
      }
      if (rankRes && rankRes.ok) {
        const rankData = await rankRes.json();
        setRankings(rankData.rankings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  // Ações do admin: sem PIN abre a janela do PIN e depois segue para a rota.
  const adminGo = (route: string) => {
    if (isAdmin) return router.push(route);
    setAfterPin(() => () => router.push(route));
    setPinOpen(true);
  };

  const handleLogout = () => {
    clearAuth(slug);
    refreshAuth();
    toast.show('Você saiu da quadra. PIN resetado!');
  };

  const formatWhen = (start?: string, end?: string | null) => {
    if (!start) return '';
    const tz = 'America/Sao_Paulo';
    const s = new Date(start);
    const day = s.toLocaleDateString('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' });
    const hour = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    return end ? `${day} · ${hour(s)} às ${hour(new Date(end))}` : `${day} · ${hour(s)}`;
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-bg text-ink p-4 pb-28 max-w-md mx-auto flex flex-col gap-3">
      <AppHeader
        title="Dashboard"
        right={isAdmin ? (
          <>
            <AdminTag />
            <Button size="sm" inline onClick={handleLogout} className="!min-h-9 !px-3 !py-1 !text-sm text-ink">Sair</Button>
          </>
        ) : undefined}
      />
      {children}
      <p className="text-center text-xs font-bold text-muted mt-2">© {new Date().getFullYear()} Desenvolvido por Amigos do Vôlei</p>
    </div>
  );

  if (loadingData) {
    return shell(
      <div className="text-center py-16">
        <div className="text-6xl animate-bounce" aria-hidden="true">🏐</div>
        <p className="font-display font-bold text-xl mt-3">Penteando a areia...</p>
      </div>,
    );
  }

  const hasSession = Boolean(activeSession);
  const hasTeams = Boolean(activeSession?.champion_name && activeSession?.challenger_name);
  const [liveA, liveB] = countSets(sessionSets);
  // O último confronto fica no Dashboard mesmo com uma partida em andamento.
  const lastShown = lastEndedSession?.champion_name ? lastEndedSession : null;

  return shell(
    <>
      {/* Estado da quadra */}
      {!hasSession && (
        <Card slim>
          <div className="flex items-center justify-center gap-2.5">
            <span className="text-3xl" aria-hidden="true">😴</span>
            <h2 className="text-xl font-bold">Quadra livre</h2>
          </div>
          {isAdmin ? (
            <Button variant="sun" onClick={() => adminGo(`/g/${slug}/setup`)}>Iniciar rodada</Button>
          ) : (
            <>
              <Sub className="text-center">Aguardando o admin iniciar a rodada.</Sub>
              <Button size="sm" onClick={() => adminGo(`/g/${slug}/setup`)}>Sou admin: iniciar rodada</Button>
            </>
          )}
        </Card>
      )}

      {hasSession && !hasTeams && (
        <Card slim>
          <h2 className="text-xl font-bold">Rodada rolando</h2>
          <Sub>Os times ainda não foram definidos.</Sub>
          {isAdmin && <Button variant="sun" onClick={() => router.push(`/g/${slug}/setup`)}>Configurar times</Button>}
        </Card>
      )}

      {hasSession && hasTeams && (
        <Card slim>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-extrabold text-xs tracking-[0.06em] text-danger">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-danger" />
              AO VIVO
            </span>
            <span className="text-xs font-bold text-muted">{formatWhen(activeSession?.created_at)}</span>
          </div>
          <Scoreboard a={liveA} b={liveB} />
          <Button variant="sea" size="sm" onClick={() => router.push(`/g/${slug}/game`)}>Abrir placar</Button>
        </Card>
      )}

      {/* Último confronto: sempre aberto, com os placares lado a lado */}
      {lastShown && (() => {
        const [a, b] = countSets(lastSets);
        return (
          <Card slim>
            <Eyebrow>Último confronto · {formatWhen(lastShown.created_at, lastShown.ended_at)}</Eyebrow>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { side: 'champion', n: a, win: a > b, list: lineupNames(lastShown.champion_name, lastShown.champion_player_ids, playersMap) },
                { side: 'challenger', n: b, win: b > a, list: lineupNames(lastShown.challenger_name, lastShown.challenger_player_ids, playersMap) },
              ] as const).map((t) => (
                <div key={t.side} className="flex flex-col gap-1.5">
                  <div className="font-display font-bold text-4xl leading-none text-center tabular-nums" aria-label={`${t.n} sets`}>{t.n}</div>
                  <Lineup side={t.side} players={t.list} win={t.win} />
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Honraria: campeão do mês passado */}
      {lastMonthChamps && (
        <Card slim className="!bg-gold">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">🏆</span>
            <div className="flex-1 min-w-0">
              <Eyebrow className="!text-ink">Campeão de {monthName(addMonths(currentMonthKey(), -1))}</Eyebrow>
              <p className="font-display font-bold text-xl leading-tight">{lastMonthChamps.champions.map((c) => c.name).join(' e ')}</p>
              <p className="font-bold text-sm">{lastMonthChamps.points} pts no mês</p>
            </div>
            <Chip onClick={() => router.push(`/g/${slug}/ranking`)}>Mural</Chip>
          </div>
        </Card>
      )}

      {/* Top 5 do mês: posições 1 a 5, empatados juntos e um embaixo do outro */}
      <Card slim>
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-bold">Top 5 de {monthName(currentMonthKey())}</h2>
          <Chip onClick={() => router.push(`/g/${slug}/ranking`)}>Ver tudo</Chip>
        </div>
        <div className="flex flex-col gap-2">
          {top5(rankings).map((g) => (
            <div
              key={g.position}
              className={`flex items-start gap-3 px-3 py-2 rounded-[16px] border-2 ${g.position <= 3 ? `${MEDAL_BG[g.position - 1]} border-line` : 'bg-surface2 border-soft'}`}
            >
              <span className="w-9 text-center font-display font-bold text-xl pt-0.5" aria-label={`${g.position}º lugar`}>
                {MEDALS[g.position] ?? `${g.position}º`}
              </span>
              <ul className="flex-1 min-w-0 font-extrabold">
                {g.shown.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="min-h-7 flex items-center">
                    {p.name}
                    {p.is_guest && <small className="ml-1.5 text-[13px] font-bold text-muted">visitante</small>}
                  </li>
                ))}
                {g.more > 0 && <li className="text-[13px] font-bold text-muted">+{g.more} no mesmo placar</li>}
              </ul>
              <span className="font-display font-bold pt-0.5">{g.points} pts</span>
            </div>
          ))}
          {rankings.length === 0 && <Sub className="text-center py-3">Nenhum ponto marcado esse mês. 🏐</Sub>}
        </div>
      </Card>

      {pinOpen && (
        <PinModal
          slug={slug}
          requiredRole="admin"
          onSuccess={() => {
            refreshAuth();
            setPinOpen(false);
            afterPin();
          }}
          onClose={() => setPinOpen(false)}
        />
      )}
    </>,
  );
}
