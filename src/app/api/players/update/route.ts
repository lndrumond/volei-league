import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { player_id, is_guest } = await request.json();

    if (!player_id || typeof is_guest !== 'boolean') {
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