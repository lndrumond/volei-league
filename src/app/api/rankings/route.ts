export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const period = searchParams.get('period'); 

    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });

    const { data: players } = await supabase.from('players').select('id, name, is_guest').eq('group_id', group.id);
    
    // Busca normal, sem colunas inventadas
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, created_at, champion_player_ids, challenger_player_ids, sets(id, winner, created_at)')
      .eq('group_id', group.id);

    if (error) throw error;

    let firstDay = new Date(0);
    if (period === 'month') {
      const now = new Date();
      // Subtrai 3 horas para alinhar com o horário de Brasília
      const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      const year = brazilTime.getUTCFullYear();
      const month = String(brazilTime.getUTCMonth() + 1).padStart(2, '0'); 
      
      // Força o dia 1º às 00:00:00 no fuso -03:00
      firstDay = new Date(`${year}-${month}-01T00:00:00-03:00`);
    }

    const points: Record<string, number> = {};
    players?.forEach(p => points[p.id] = 0);

    sessions?.forEach(session => {
      const champIds = session.champion_player_ids || [];
      const challIds = session.challenger_player_ids || [];
      
      session.sets?.forEach(set => {
        const dateToCompare = new Date(set.created_at || session.created_at);
        
        if (dateToCompare >= firstDay) {
          // Lógica simples: ganhou o set, o ponto vai pro time inteiro da sessão
          const winningIds = set.winner === 'champion' ? champIds : challIds;
          winningIds.forEach((id: string) => {
            if (points[id] !== undefined) points[id] += 1;
          });
        }
      });
    });

    const rankings = players?.map(p => ({
      id: p.id,
      name: p.name,
      is_guest: p.is_guest,
      points: points[p.id] || 0
    })).filter(p => p.points > 0).sort((a, b) => b.points - a.points) || [];

    return NextResponse.json({ ok: true, rankings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao calcular os pontos na areia.' }, { status: 500 });
  }
}