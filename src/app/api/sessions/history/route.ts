import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    // Pega as últimas 10 rodadas já encerradas, trazendo os "sets" junto para calcular o placar
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        id, created_at, ended_at, champion_name, challenger_name, 
        sets (id, winner)
      `)
      .eq('group_id', group.id)
      .eq('status', 'ended')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ ok: true, sessions });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao cavar o histórico na areia.' }, { status: 500 });
  }
}