export const dynamic = 'force-dynamic'; // Mata o cache preguiçoso do Next.js

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const period = searchParams.get('period'); // 'month' ou 'all'

    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });

    // Pega todos os jogadores
    const { data: players } = await supabase.from('players').select('id, name, is_guest').eq('group_id', group.id);
    
    // Busca TODAS as sessões e sets do grupo
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, created_at, champion_player_ids, challenger_player_ids, sets(id, winner, created_at)')
      .eq('group_id', group.id);

    if (error) throw error;

    // Calcula o dia 1º do mês atual
    let firstDay = new Date(0); // Padrão 'all' = 1970 (pega tudo desde o início)
    if (period === 'month') {
      const now = new Date();
      // Pega o dia 1º do mês atual, respeitando o fuso horário
      firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const points: Record<string, number> = {};
    players?.forEach(p => points[p.id] = 0);

    sessions?.forEach(session => {
      const champIds = session.champion_player_ids || [];
      const challIds = session.challenger_player_ids || [];
      
      session.sets?.forEach(set => {
        // Usa a data do SET (Ponto). Se o set não tiver, usa a da rodada por segurança.
        const dateToCompare = new Date(set.created_at || session.created_at);
        
        // FILTRO MÁGICO: Só conta o ponto se a data do set for >= ao dia 1º do mês
        if (dateToCompare >= firstDay) {
          const winningIds = set.winner === 'champion' ? champIds : challIds;
          winningIds.forEach((id: string) => {
            if (points[id] !== undefined) points[id] += 1;
          });
        }
      });
    });

    // Formata o pódio, filtra quem tem 0 e ordena
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