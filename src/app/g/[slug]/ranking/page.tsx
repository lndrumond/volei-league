'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/avlClient';
import { groupRanking, MEDALS } from '@/lib/ranking';
import { Card, Chip, EmptyState, Sub } from '@/components/ui';
import AppHeader from '@/components/AppHeader';

interface RankingItem { name: string; points: number; is_guest?: boolean; }

const MEDAL_BG = ['bg-gold', 'bg-silver', 'bg-bronze'];

export default function RankingPage() {
  const { slug } = useParams() as { slug: string };

  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [period, setPeriod] = useState<'month' | 'all'>('month');
  const [filter, setFilter] = useState<'todos' | 'fixos'>('todos');

  useEffect(() => {
    setLoading(true);
    setError(false);
    apiFetch(slug, `/api/rankings?slug=${slug}&period=${period}`)
      .then((res) => res.json())
      .then((data) => setRankings(data.rankings || []))
      .catch((err) => { console.error(err); setError(true); })
      .finally(() => setLoading(false));
  }, [slug, period]);

  // "Só Fixos" recalcula as posições só entre os fixos.
  const groups = groupRanking(filter === 'fixos' ? rankings.filter((r) => !r.is_guest) : rankings);

  return (
    <div className="min-h-screen bg-bg text-ink p-4 pb-28 max-w-md mx-auto flex flex-col gap-3">
      <AppHeader title="Ranking" />
      <h1 className="text-2xl font-bold">Ranking dos Atletas</h1>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        <Chip pressed={period === 'month'} onClick={() => setPeriod('month')}>Mês atual</Chip>
        <Chip pressed={period === 'all'} onClick={() => setPeriod('all')}>Geral</Chip>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quem aparece">
        <Chip pressed={filter === 'todos'} onClick={() => setFilter('todos')}>Todo Mundo</Chip>
        <Chip pressed={filter === 'fixos'} onClick={() => setFilter('fixos')}>Só Fixos</Chip>
      </div>

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
