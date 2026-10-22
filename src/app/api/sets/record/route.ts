import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fail, getSession } from '@/lib/sessions';

export async function POST(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { session_id, winner } = await request.json();

    if (!session_id || (winner !== 'champion' && winner !== 'challenger')) {
      return fail('Faltou o ID da partida ou o vencedor.', 400);
    }

    const session = await getSession(session_id);
    if (!session) return fail('Partida não encontrada.', 404);
    if (session.status !== 'active') return fail('Essa partida já foi encerrada.', 409);
    if (!(session.champion_player_ids?.length) || !(session.challenger_player_ids?.length)) {
      return fail('Monte os times antes de anotar um set.', 409);
    }

    const { data: newSet, error } = await supabase
      .from('sets')
      .insert({ session_id: session.id, winner })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, set: newSet });
  } catch (err) {
    console.error(err);
    return fail('O Yoshi engoliu a caneta! Erro ao anotar.', 500);
  }
}
