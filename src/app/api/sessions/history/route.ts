import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const TZ = 'America/Sao_Paulo';
const DAY_MS = 24 * 60 * 60 * 1000;
const LAST_ROUNDS = 5;
const PAGE = 1000; // o Supabase devolve no máximo 1000 linhas por pedido

// Dia (YYYY-MM-DD) em Brasília de um instante.
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });
const startOfDay = (key: string) => new Date(`${key}T00:00:00-03:00`);
const endOfDay = (key: string) => new Date(`${key}T23:59:59.999-03:00`);
const isDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(startOfDay(v).getTime());

interface Row {
  id: string;
  created_at: string;
  ended_at: string | null;
  description: string | null;
  champion_name: string | null;
  challenger_name: string | null;
  champion_player_ids: string[] | null;
  challenger_player_ids: string[] | null;
  sets: { id: string; winner: string }[] | null;
}

// Histórico por rodadas (o dia em Brasília). Cada rodada traz suas partidas em ordem de horário.
// Filtros: last5 (padrão), today, 7d, range (startDate e endDate, sem limite de tamanho: traz tudo do período).
// A data da rodada é a do registro (created_at). O nome da partida (description) vai junto, pois o admin
// costuma anotar nele a data real quando registra um jogo depois.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const filter = searchParams.get('filter') || 'last5';

    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    const buildQuery = () => supabase
      .from('sessions')
      .select('id, created_at, ended_at, description, champion_name, challenger_name, champion_player_ids, challenger_player_ids, sets (id, winner)')
      .eq('group_id', group.id)
      .eq('status', 'ended')
      .not('champion_name', 'is', null) // rodada abortada (sem times) não aparece
      .order('created_at', { ascending: false })
      .order('id'); // desempate fixo, para a paginação não repetir nem pular linhas

    let query = buildQuery();
    const today = dayKey(new Date());
    let paginate = true;

    if (filter === 'today') {
      query = query.gte('created_at', startOfDay(today).toISOString());
    } else if (filter === '7d') {
      const from = dayKey(new Date(startOfDay(today).getTime() - 6 * DAY_MS));
      query = query.gte('created_at', startOfDay(from).toISOString());
    } else if (filter === 'range') {
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      if (!isDay(startDate) || !isDay(endDate) || startDate > endDate) {
        return NextResponse.json({ error: 'Período inválido.' }, { status: 400 });
      }
      query = query
        .gte('created_at', startOfDay(startDate).toISOString())
        .lte('created_at', endOfDay(endDate).toISOString());
    } else if (filter === 'last5') {
      query = query.limit(300);
      paginate = false;
    } else {
      return NextResponse.json({ error: 'Filtro inválido.' }, { status: 400 });
    }

    // Filtros por período trazem tudo, página por página.
    let data: Row[] = [];
    if (paginate) {
      for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await query.range(from, from + PAGE - 1);
        if (error) throw error;
        data = data.concat((page || []) as unknown as Row[]);
        if (!page || page.length < PAGE) break;
      }
    } else {
      const { data: rows, error } = await query;
      if (error) throw error;
      data = (rows || []) as unknown as Row[];
    }

    const byDay = new Map<string, ReturnType<typeof toMatch>[]>();
    for (const row of data) {
      const match = toMatch(row);
      if (!match) continue;
      const key = dayKey(new Date(row.created_at));
      byDay.set(key, [...(byDay.get(key) || []), match]);
    }

    let rounds = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // dia mais recente primeiro
      .map(([day, matches]) => ({
        day,
        matches: matches.sort((a, b) => (a!.created_at < b!.created_at ? -1 : 1)), // partida 1, 2, 3...
      }));

    if (filter === 'last5') rounds = rounds.slice(0, LAST_ROUNDS);

    return NextResponse.json({ ok: true, rounds });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao cavar o histórico na areia.' }, { status: 500 });
  }
}

// Sem repetidos nas listas; partida sem nenhum set não tem placar e não entra.
function toMatch(row: Row) {
  const sets = row.sets || [];
  if (sets.length === 0) return null;
  return {
    id: row.id,
    created_at: row.created_at,
    ended_at: row.ended_at,
    description: row.description,
    champion_name: row.champion_name,
    challenger_name: row.challenger_name,
    champion_player_ids: Array.from(new Set(row.champion_player_ids || [])),
    challenger_player_ids: Array.from(new Set(row.challenger_player_ids || [])),
    sets: [
      sets.filter((s) => s.winner === 'champion').length,
      sets.filter((s) => s.winner === 'challenger').length,
    ] as [number, number],
  };
}
