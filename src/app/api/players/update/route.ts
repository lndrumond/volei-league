import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const { player_id, is_guest } = await request.json();

    if (!player_id) {
      return NextResponse.json({ error: 'Faltam dados do jogador.' }, { status: 400 });
    }

    // Atualiza o status de is_guest no banco de dados
    const { data: player, error } = await supabase
      .from('players')
      .update({ is_guest })
      .eq('id', player_id)
      .select('id, name, is_guest')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, player });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao atualizar o jogador.' }, { status: 500 });
  }
}