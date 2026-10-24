export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { loadMonthlyPoints } from '@/lib/monthlyPoints';
import { currentMonthKey, MONTH_KEY } from '@/lib/brMonth';

// ?period=month (mês atual, padrão do Top 5) | all (geral) | ?month=AAAA-MM (um mês específico, horário de Brasília)
// ?metric=fominha: conta partidas escaladas (em vez de sets ganhos). Nesse caso `points` traz a quantidade de partidas.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const period = searchParams.get('period');
    const monthParam = searchParams.get('month');
    const metric = searchParams.get('metric');

    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });
    if (monthParam && !MONTH_KEY.test(monthParam)) return NextResponse.json({ error: 'Mês inválido' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });

    const { players, byMonth, gamesByMonth } = await loadMonthlyPoints(group.id);
    const source = metric === 'fominha' ? gamesByMonth : byMonth;

    const month = monthParam || (period === 'month' ? currentMonthKey() : null);
    const points: Record<string, number> = {};
    for (const [key, pts] of source) {
      if (month && key !== month) continue;
      for (const [id, n] of Object.entries(pts)) points[id] = (points[id] || 0) + n;
    }

    const rankings = players
      .map((p) => ({ id: p.id, name: p.name, is_guest: p.is_guest, points: points[p.id] || 0 }))
      .filter((p) => p.points > 0)
      .sort((a, b) => b.points - a.points);

    return NextResponse.json({ ok: true, month, metric: metric === 'fominha' ? 'fominha' : 'points', rankings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao calcular os pontos na areia.' }, { status: 500 });
  }
}
