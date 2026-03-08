import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    let query = supabase
      .from('sessions')
      .select(`
        id, created_at, ended_at, champion_name, challenger_name, 
        champion_player_ids, challenger_player_ids,
        sets (id, winner)
      `)
      .eq('group_id', group.id)
      .eq('status', 'ended')
      .order('created_at', { ascending: false });

    if (startDate && endDate) {
      // 🚨 CORREÇÃO: Força o horário de início (00:00) e fim (23:59) no fuso do Brasil (-03:00)
      const start = new Date(`${startDate}T00:00:00-03:00`);
      const end = new Date(`${endDate}T23:59:59-03:00`);
      
      query = query.gte('created_at', start.toISOString())
                   .lte('created_at', end.toISOString())
                   .limit(50); 
    } else {
      query = query.limit(10);
    }

    const { data: sessions, error } = await query;

    if (error) throw error;

    return NextResponse.json({ ok: true, sessions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao cavar o histórico na areia.' }, { status: 500 });
  }
}