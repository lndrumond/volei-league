'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/avlClient';
import { lineupNames } from '@/lib/teams';
import { Card, Chip, EmptyState, Lineup, Scoreboard, Sub } from '@/components/ui';
import AppHeader from '@/components/AppHeader';

interface Match {
  id: string;
  created_at: string;
  ended_at: string | null;
  description: string | null;
  champion_name: string | null;
  challenger_name: string | null;
  champion_player_ids: string[];
  challenger_player_ids: string[];
  sets: [number, number];
}
interface Round { day: string; matches: Match[] }

type Filter = 'last5' | 'today' | '7d' | 'range';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'last5', label: 'Últimas 5 rodadas' },
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: 'range', label: 'Escolher período' },
];

const TZ = 'America/Sao_Paulo';
const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const hour = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00-03:00`).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit' });

const DATE_FIELD = 'mt-1 w-full bg-surface2 text-ink border-[3px] border-line rounded-[14px] px-3 py-2 min-h-12 font-bold';

export default function HistoryPage() {
  const { slug } = useParams() as { slug: string };

  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playersMap, setPlayersMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('last5');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(slug, `/api/players/list?slug=${slug}`);
        if (!res.ok) return;
        const data = await res.json();
        const map: Record<string, string> = {};
        data.players?.forEach((p: { id: string; name: string }) => { map[p.id] = p.name.trim(); });
        setPlayersMap(map);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [slug]);

  const load = useCallback(async () => {
    if (filter === 'range' && (!startDate || !endDate)) { setRounds([]); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      let url = `/api/sessions/history?slug=${slug}&filter=${filter}`;
      if (filter === 'range') url += `&startDate=${startDate}&endDate=${endDate}`;
      const res = await apiFetch(slug, url);
      const data = await res.json();
      if (!res.ok) {
        setRounds([]);
        setError(data.error || 'Erro ao buscar o histórico.');
      } else {
        setRounds(data.rounds || []);
      }
    } catch (e) {
      console.error(e);
      setError('Erro ao buscar o histórico.');
    } finally {
      setLoading(false);
    }
  }, [slug, filter, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const matchCard = (m: Match, n: number) => {
    const [a, b] = m.sets;
    const champ = lineupNames(m.champion_name, m.champion_player_ids, playersMap);
    const chall = lineupNames(m.challenger_name, m.challenger_player_ids, playersMap);
    return (
      <Card key={m.id} slim>
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-xs tracking-[0.08em] uppercase text-muted">Partida {n}</span>
          <span className="text-xs font-bold text-muted">{hour(m.created_at)}{m.ended_at ? ` às ${hour(m.ended_at)}` : ''}</span>
        </div>
        {m.description && <p className="font-extrabold text-sm break-words">{m.description}</p>}
        <Scoreboard a={a} b={b} names={false} />
        <div className="grid grid-cols-2 gap-2.5">
          <Lineup side="champion" players={champ} win={a > b} />
          <Lineup side="challenger" players={chall} win={b > a} />
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-bg text-ink p-4 pb-28 max-w-md mx-auto flex flex-col gap-3">
      <AppHeader title="Histórico" />
      <h1 className="text-2xl font-bold">Baú de Resenhas</h1>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {FILTERS.map((f) => (
          <Chip key={f.id} pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>
        ))}
      </div>

      {filter === 'range' && (
        <div className="grid grid-cols-2 gap-2.5">
          <label className="font-extrabold text-xs tracking-[0.08em] uppercase text-muted">
            De
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={DATE_FIELD} />
          </label>
          <label className="font-extrabold text-xs tracking-[0.08em] uppercase text-muted">
            Até
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={DATE_FIELD} />
          </label>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-6xl animate-bounce" aria-hidden="true">🏐</div>
          <p className="font-display font-bold text-xl mt-3">Rebobinando a fita...</p>
        </div>
      ) : error ? (
        <p role="alert" className="bg-danger text-danger-ink border-[3px] border-line rounded-[16px] px-4 py-3 font-bold text-center">{error}</p>
      ) : rounds.length === 0 ? (
        <EmptyState
          icon="🫗"
          title="Areia esfriou"
          text={filter === 'range' && (!startDate || !endDate) ? 'Escolha a data inicial e a final.' : 'Nenhuma rodada neste período.'}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rounds.map((r) => {
            const n = r.matches.length;
            // Toda rodada é uma sanfona; abre sozinha se tiver até 2 partidas.
            return (
              <details key={r.day} open={n <= 2} className="group">
                <summary className="flex items-center justify-between gap-3 bg-surface text-ink border-[3px] border-line rounded-card shadow-pop px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden min-h-14">
                  <h2 className="text-lg font-bold first-letter:uppercase">{r.day === todayKey ? 'Hoje · ' : ''}{dayLabel(r.day)}</h2>
                  <span className="flex items-center gap-2.5 shrink-0">
                    <span className="font-extrabold text-sm text-muted">{n} {n === 1 ? 'partida' : 'partidas'}</span>
                    <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-180">▼</span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3 mt-3">{r.matches.map((m, i) => matchCard(m, i + 1))}</div>
              </details>
            );
          })}
        </div>
      )}

      {!loading && !error && <Sub className="text-center">Rodadas abortadas, sem times, não aparecem aqui.</Sub>}
    </div>
  );
}
