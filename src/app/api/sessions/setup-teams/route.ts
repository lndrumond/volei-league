import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { session_id, champion_name, challenger_name, champion_player_ids, challenger_player_ids } = body;

    if (!session_id || !champion_name || !challenger_name) {
      return NextResponse.json({ error: 'Faltou o nome dos times ou o ID da rodada.' }, { status: 400 });
    }

    // Atualiza a rodada ativa com os times e SALVA os jogadores selecionados!
    const { data: session, error } = await supabase
      .from('sessions')
      .update({
        champion_name,
        challenger_name,
        champion_player_ids: champion_player_ids || [],
        challenger_player_ids: challenger_player_ids || []
      })
      .eq('id', session_id)
      .select()
      .single();

    if (error) {
      console.error('Erro no Supabase:', error);
      return NextResponse.json({ error: 'Erro ao salvar os times na areia.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    console.error('Erro catastrofico na API de setup:', err);
    return NextResponse.json({ error: 'O Yoshi engoliu o apito.' }, { status: 500 });
  }
}