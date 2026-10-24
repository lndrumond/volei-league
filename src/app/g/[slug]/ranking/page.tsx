'use client';

import { useParams, useSearchParams } from 'next/navigation';
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

type Tab = 'month' | 'all' | 'fominha' | 'mural';
// Escopo da aba Fominha: mês atual ou todos os tempos.
type Scope = 'month' | 'all';

const Spinner = () => (
  <div className="text-center py-12">
    <div className="text-6xl animate-spin" aria-hidden="true">🏐</div>
  </div>
);

export default function RankingPage() {
  const { slug } = useParams() as { slug: string };

  // Link do Dashboard (?aba=mural) abre direto no mural.
  const searchParams = useSearchParams();
  // Links dos cards do Dashboard: ?aba=mes|todos|fominha|mural e ?escopo=mes|todos (fominha).
  const abaParam = searchParams.get('aba');
  const [tab, setTab] = useState<Tab>(
    abaParam === 'mural' ? 'mural' : abaParam === 'todos' ? 'all' : abaParam === 'fominha' ? 'fominha' : 'month',
  );
  const [scope, setScope] = useState<Scope>(searchParams.get('escopo') === 'todos' ? 'all' : 'month');
  // Mês escolhido dentro do mural (AAAA-MM); null = lista de campeões
  const [picked, setPicked] = useState<string | null>(null);

  // Resultado da última busca, com a consulta que o gerou: se a consulta mudou, está carregando.
  const [result, setResult] = useState<{ query: string; rankings: RankingItem[]; error: boolean } | null>(null);

  const [mural, setMural] = useState<MonthChampions[] | null>(null); // null = ainda não carregou
  const [muralError, setMuralError] = useState(false);
  const [showAllMural, setShowAllMural] = useState(false);

  // O mural só é buscado na primeira vez que a aba é aberta (ou de novo, se deu erro e a aba foi tocada).
  useEffect(() => {
    if (tab !== 'mural' || mural !== null || muralError) return;
    apiFetch(slug, `/api/rankings/champions?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => setMural(data.champions || []))
      .catch((err) => { console.error(err); setMuralError(true); });
  }, [slug, tab, mural, muralError]);

  // Ranking: mês atual, todos os tempos, fominha (no escopo escolhido) ou o mês escolhido no mural.
  const query =
    tab === 'month' ? 'period=month'
    : tab === 'all' ? 'period=all'
    : tab === 'fominha' ? `metric=fominha&period=${scope === 'month' ? 'month' : 'all'}`
    : picked ? `month=${picked}` : null;
  useEffect(() => {
    if (!query) return;
    let stale = false; // ignora a resposta se a pessoa já trocou de aba
    apiFetch(slug, `/api/rankings?slug=${slug}&${query}`)
      .then((res) => res.json())
      .then((data) => { if (!stale) setResult({ query, rankings: data.rankings || [], error: false }); })
      .catch((err) => { console.error(err); if (!stale) setResult({ query, rankings: [], error: true }); });
    return () => { stale = true; };
  }, [slug, query]);

  const loading = !result || result.query !== query;
  const error = !loading && result.error;
  const rankings = loading ? [] : result.rankings;

  const choose = (t: Tab) => { setTab(t); setPicked(null); if (t === 'mural') setMuralError(false); };

  const groups = groupRanking(rankings);
  const muralShown = mural ? (showAllMural ? mural : mural.slice(0, MURAL_VISIBLE)) : [];
  const showingMuralList = tab === 'mural' && !picked;
  // Na lista do mural ainda não há mês escolhido, então o título só vale fora dela.
  const month = tab === 'month' ? currentMonthKey() : picked;
  const isFominha = tab === 'fominha';
  const heading = tab === 'all' || (isFominha && scope === 'all') ? '♾️ Todos os tempos' : month ? monthLabel(month) : isFominha ? monthLabel(currentMonthKey()) : '';

  return (
    <div className="min-h-screen bg-bg text-ink p-4 pb-28 max-w-md mx-auto flex flex-col gap-3">
      <AppHeader title="Ranking" />
      <h1 className="text-2xl font-bold">Ranking dos Atletas</h1>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de ranking">
        <Chip pressed={tab === 'month'} onClick={() => choose('month')}>📅 Mês atual</Chip>
        <Chip pressed={tab === 'all'} onClick={() => choose('all')}>♾️ Todos os tempos</Chip>
        <Chip pressed={tab === 'fominha'} onClick={() => choose('fominha')}>🏐 Fominha</Chip>
        <Chip pressed={tab === 'mural'} onClick={() => choose('mural')}>🏆 Mural dos Campeões</Chip>
      </div>

      {showingMuralList ? (
        muralError ? (
          <p role="alert" className="bg-danger text-danger-ink border-[3px] border-line rounded-[16px] px-4 py-3 font-bold text-center">Erro ao buscar o mural.</p>
        ) : mural === null ? (
          <Spinner />
        ) : mural.length === 0 ? (
          <EmptyState icon="🏆" title="Mural vazio" text="Nenhum mês fechou com jogos ainda." />
        ) : (
          <Card slim className="gap-2">
            <h2 className="text-lg font-bold">🏆 Campeões de cada mês</h2>
            <ul className="flex flex-col gap-1.5">
              {muralShown.map((m) => (
                <li key={m.month}>
                  <button
                    type="button"
                    onClick={() => setPicked(m.month)}
                    className="w-full min-h-11 flex items-center gap-3 px-3 py-1.5 rounded-[14px] border-2 text-left bg-surface2 border-soft"
                  >
                    <span className="w-16 shrink-0 font-display font-bold capitalize">{monthShort(m.month)}</span>
                    <span className="flex-1 min-w-0 font-extrabold">
                      <span aria-hidden="true">🥇 </span>
                      {m.champions.map((c) => c.name).join(' e ')}
                    </span>
                    <span className="font-display font-bold shrink-0">{m.points} pts</span>
                  </button>
                </li>
              ))}
            </ul>
            {mural.length > MURAL_VISIBLE && (
              <Chip onClick={() => setShowAllMural((v) => !v)}>{showAllMural ? 'Ver menos' : `Ver todos (${mural.length})`}</Chip>
            )}
            <Sub>Toque num mês para ver o ranking completo dele.</Sub>
          </Card>
        )
      ) : (
        <>
          {tab === 'mural' && (
            <div>
              <Chip onClick={() => setPicked(null)}>← Voltar ao mural</Chip>
            </div>
          )}
          {isFominha && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Período da fominha">
              <Chip pressed={scope === 'month'} onClick={() => setScope('month')}>Mês atual</Chip>
              <Chip pressed={scope === 'all'} onClick={() => setScope('all')}>Todos os tempos</Chip>
            </div>
          )}
          <h2 className="text-lg font-bold first-letter:uppercase">{heading}</h2>
          {isFominha ? (
            <Sub>Conta a quantidade de partidas jogadas, não de dias. Partida é um confronto entre dois times, e cada uma em que a pessoa foi escalada conta 1 (com ou sem set anotado). Um dia pode ter várias partidas, por exemplo quando há troca de times. Empatados dividem a posição e ficam um embaixo do outro, em ordem alfabética.</Sub>
          ) : (
            <Sub>Cada set ganho vale +1 ponto para cada jogador do time vencedor. Empatados dividem a posição e ficam um embaixo do outro, em ordem alfabética.</Sub>
          )}

          {loading ? (
            <Spinner />
          ) : error ? (
            <p role="alert" className="bg-danger text-danger-ink border-[3px] border-line rounded-[16px] px-4 py-3 font-bold text-center">Erro ao buscar o ranking.</p>
          ) : groups.length === 0 ? (
            <EmptyState icon="🌬️" title="A quadra tá vazia!" text={isFominha ? 'Ninguém entrou em quadra ainda. 🏐' : 'Ninguém marcou ponto ainda. 🏐'} />
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
                        {p.is_guest && <small className={`text-[13px] font-bold ${g.position <= 3 ? 'text-ink' : 'text-muted'}`}>visitante</small>}
                      </li>
                    ))}
                  </ul>
                  <span className="font-display font-bold pt-1.5 shrink-0">
                    {isFominha ? `${g.points} ${g.points === 1 ? 'partida' : 'partidas'}` : `${g.points} pts`}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
