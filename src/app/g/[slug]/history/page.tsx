'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/avlClient';
import { CHAMPION_NAME, CHALLENGER_NAME, lineupNames } from '@/lib/teams';

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
const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const hour = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00-03:00`).toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit' });

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
      <div key={m.id} className="bg-white rounded-[1.5rem] p-3 shadow-md border-b-4 border-gray-200">
        <div className="flex justify-between items-center mb-2 border-b border-dashed border-gray-100 pb-2">
          <span className="text-xs font-black text-gray-600 uppercase tracking-wider">Partida {n}</span>
          <span className="text-xs font-bold text-gray-400">
            {hour(m.created_at)}{m.ended_at ? ` às ${hour(m.ended_at)}` : ''}
          </span>
        </div>
        {m.description && <p className="text-center text-sm font-black text-green-800 mb-1 break-words">{m.description}</p>}
        <div className="text-center font-black text-4xl text-gray-800 tabular-nums mb-2" aria-label={`${a} a ${b}`}>
          {a} <span className="text-lg text-gray-400">x</span> {b}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { title: CHAMPION_NAME, win: a > b, list: champ, color: 'text-green-700' },
            { title: CHALLENGER_NAME, win: b > a, list: chall, color: 'text-orange-600' },
          ].map((t) => (
            <div key={t.title} className={`rounded-xl border-2 p-2 ${t.win ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-gray-50'}`}>
              <h3 className={`font-black text-sm text-center ${t.color}`}>{t.win && '👑 '}{t.title}</h3>
              <ul className="mt-1 text-sm font-bold text-gray-700 leading-snug">
                {t.list.map((p, i) => (
                  <li key={i}>
                    {p.name}
                    {p.captain && <span className="ml-1 text-[10px] font-black text-orange-500 uppercase">cap.</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-green-100 p-4 pb-28 max-w-md mx-auto relative font-sans">
      <h1 className="text-2xl font-black text-green-900 text-center mb-3">Baú de Resenhas 📜</h1>

      <div className="bg-white p-3 rounded-2xl shadow-sm border-b-4 border-orange-200 mb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3 py-2 min-h-11 rounded-full font-black text-sm border-2 ${
                filter === f.id ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-orange-700 border-orange-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filter === 'range' && (
          <div className="flex gap-2 items-center mt-3">
            <label className="flex-1 text-xs font-black text-orange-800">
              De
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full bg-gray-50 rounded-lg p-2 text-sm font-bold border-2 border-orange-200" />
            </label>
            <label className="flex-1 text-xs font-black text-orange-800">
              Até
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full bg-gray-50 rounded-lg p-2 text-sm font-bold border-2 border-orange-200" />
            </label>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="text-6xl animate-bounce">🏐</div>
          <p className="text-green-800 font-black mt-2">Rebobinando a fita...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-center text-red-700 font-bold">{error}</div>
      ) : rounds.length === 0 ? (
        <div className="bg-white rounded-3xl p-6 text-center border-b-4 border-gray-200 shadow-sm">
          <span className="text-5xl mb-3 block">🏜️</span>
          <h2 className="font-black text-gray-700 text-lg">Areia esfriou</h2>
          <p className="text-gray-500 font-bold mt-1 text-sm">
            {filter === 'range' && (!startDate || !endDate) ? 'Escolha a data inicial e a final.' : 'Nenhuma rodada neste período.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rounds.map((r) => {
            const n = r.matches.length;
            const isToday = r.day === todayKey;
            // Igual ao mockup: toda rodada é uma sanfona; abre sozinha se tiver até 2 partidas.
            return (
              <details key={r.day} open={n <= 2} className="group">
                <summary className="flex items-center justify-between gap-3 bg-white rounded-2xl p-4 shadow-sm border-b-4 border-green-300 cursor-pointer list-none [&::-webkit-details-marker]:hidden min-h-14">
                  <h2 className="font-black text-green-900 capitalize">{isToday ? 'Hoje · ' : ''}{dayLabel(r.day)}</h2>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-gray-500">{n} {n === 1 ? 'partida' : 'partidas'}</span>
                    <span aria-hidden="true" className="text-green-700 transition-transform group-open:rotate-180">▼</span>
                  </span>
                </summary>
                <div className="flex flex-col gap-3 mt-3">
                  {r.matches.map((m, i) => matchCard(m, i + 1))}
                </div>
              </details>
            );
          })}
        </div>
      )}
      {!loading && !error && <p className="text-center text-sm font-bold text-gray-500 mt-4">Rodadas abortadas, sem times, não aparecem aqui.</p>}
    </div>
  );
}
