'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/avlClient';
import { groupRanking, MEDALS } from '@/lib/ranking';
import { currentMonthKey, monthLabel, monthShort } from '@/lib/brMonth';
import { Card, Chip, EmptyState, Sub } from '@/components/ui';
import AppHeader from '@/components/AppHeader';

interface RankingItem { name: string; points: number; is_guest?: boolean; }
interface MonthChampions { month: string; points: number; champions: { id: string; name: string; is_guest?: boolean | null }[]; }

const MEDAL_BG = ['bg-gold', 'bg-silver', 'bg-bronze'];
// Quantos meses o mural mostra de início; os mais antigos ficam atrás de "Ver todos".
const MURAL_VISIBLE = 12;

// 'month' = mês atual, 'all' = geral, 'AAAA-MM' = um mês fechado (escolhido no mural)
type View = 'month' | 'all' | string;

export default function RankingPage() {
  const { slug } = useParams() as { slug: string };

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<View>('month');

  const [mural, setMural] = useState<MonthChampions[]>([]);
  const [showAllMural, setShowAllMural] = useState(false);

  useEffect(() => {
    apiFetch(slug, `/api/rankings/champions?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => setMural(data.champions || []))
      .catch((err) => console.error(err));
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const query = view === 'month' ? 'period=month' : view === 'all' ? 'period=all' : `month=${view}`;
    apiFetch(slug, `/api/rankings?slug=${slug}&${query}`)
      .then((res) => res.json())
      .then((data) => setRankings(data.rankings || []))
      .catch((err) => { console.error(err); setError(true); })
      .finally(() => setLoading(false));
  }, [slug, view]);

  const groups = groupRanking(rankings);
  const muralShown = showAllMural ? mural : mural.slice(0, MURAL_VISIBLE);
  const heading = view === 'all' ? 'Geral' : monthLabel(view === 'month' ? currentMonthKey() : view);

  return (
    <div className="min-h-screen bg-bg text-ink p-4 pb-28 max-w-md mx-auto flex flex-col gap-3">
      <AppHeader title="Ranking" />
      <h1 className="text-2xl font-bold">Ranking dos Atletas</h1>

      {mural.length > 0 && (
        <Card slim className="gap-2">
          <h2 className="text-lg font-bold">🏆 Mural dos Campeões</h2>
          <ul className="flex flex-col gap-1.5">
            {muralShown.map((m) => {
              const on = view === m.month;
              return (
                <li key={m.month}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setView(on ? 'month' : m.month)}
                    className={`w-full min-h-11 flex items-center gap-3 px-3 py-1.5 rounded-[14px] border-2 text-left ${on ? 'bg-sun text-sun-ink border-line' : 'bg-surface2 border-soft'}`}
                  >
                    <span className="w-16 shrink-0 font-display font-bold capitalize">{monthShort(m.month)}</span>
                    <span className="flex-1 min-w-0 font-extrabold">
                      <span aria-hidden="true">🏆 </span>
                      {m.champions.map((c) => c.name).join(' e ')}
                    </span>
                    <span className="font-display font-bold shrink-0">{m.points} pts</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {mural.length > MURAL_VISIBLE && (
            <Chip onClick={() => setShowAllMural((v) => !v)}>{showAllMural ? 'Ver menos' : `Ver todos (${mural.length})`}</Chip>
          )}
          <Sub>Toque num mês para ver o ranking completo dele.</Sub>
        </Card>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        <Chip pressed={view === 'month'} onClick={() => setView('month')}>Mês atual</Chip>
        <Chip pressed={view === 'all'} onClick={() => setView('all')}>Geral</Chip>
      </div>

      <h2 className="text-lg font-bold first-letter:uppercase">{heading}</h2>
      <Sub>Cada set ganho vale +1 ponto para cada jogador do time vencedor. Empatados dividem a posição e ficam um embaixo do outro, em ordem alfabética.</Sub>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-6xl animate-spin" aria-hidden="true">🏐</div>
        </div>
      ) : error ? (
        <p role="alert" className="bg-danger text-danger-ink border-[3px] border-line rounded-[16px] px-4 py-3 font-bold text-center">Erro ao buscar o ranking.</p>
      ) : groups.length === 0 ? (
        <EmptyState icon="🌬️" title="A quadra tá vazia!" text="Ninguém marcou ponto ainda. 🏐" />
      ) : (
        <Card slim className="gap-2">
          {groups.map((g) => (
            <div
              key={g.position}
              className={`flex items-start gap-3 px-3 py-2 rounded-[16px] border-2 ${g.position <= 3 ? `${MEDAL_BG[g.position - 1]} border-line` : 'bg-surface2 border-soft'}`}
            >
              <span className="w-10 text-center font-display font-bold text-xl pt-1" aria-label={`${g.position}º lugar`}>
                {MEDALS[g.position] ?? `${g.position}º`}
              </span>
              <ul className="flex-1 min-w-0 font-extrabold text-base">
                {g.players.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="min-h-9 flex items-center flex-wrap gap-x-2">
                    {p.name}
                    {p.is_guest && <small className="text-[13px] font-bold text-muted">visitante</small>}
                  </li>
                ))}
              </ul>
              <span className="font-display font-bold pt-1.5 shrink-0">{g.points} pts</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
