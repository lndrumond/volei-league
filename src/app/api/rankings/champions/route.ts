export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadMonthlyPoints } from '@/lib/monthlyPoints';
import { currentMonthKey } from '@/lib/brMonth';

// Mural dos campeões: um registro por mês já encerrado (horário de Brasília), do mais recente ao mais antigo.
// Empate no 1º lugar: todos os empatados são campeões, em ordem alfabética. Mês sem jogo não aparece.
// O mês atual ainda não tem campeão. Calculado na hora, então um jogo registrado depois corrige o mural sozinho.
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });

    const { players, byMonth } = await loadMonthlyPoints(group.id);
    const byId = new Map(players.map((p) => [p.id, p]));
    const current = currentMonthKey();

    const champions = [...byMonth.entries()]
      .filter(([key]) => key < current)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .flatMap(([key, pts]) => {
        const top = Math.max(0, ...Object.values(pts));
        if (top === 0) return [];
        const names = Object.entries(pts)
          .filter(([, n]) => n === top)
          .map(([id]) => byId.get(id))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          .map((p) => ({ id: p.id, name: p.name, is_guest: p.is_guest }));
        return [{ month: key, points: top, champions: names }];
      });

    return NextResponse.json({ ok: true, currentMonth: current, champions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao montar o mural dos campeões.' }, { status: 500 });
  }
}
