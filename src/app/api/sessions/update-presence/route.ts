import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { allPlayersBelongToGroup, cleanIdList, fail, getSession, hasDuplicates } from '@/lib/sessions';

// Ajusta os presentes da partida ativa. Quem já está em um time não pode sair da lista.
export async function POST(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { session_id, present_player_ids } = await request.json();

    const present = cleanIdList(present_player_ids);
    if (!present || present_player_ids === undefined) return fail('Lista de presentes inválida.', 400);
    if (hasDuplicates(present)) return fail('Tem jogador repetido na lista de presentes.', 400);

    const session = await getSession(session_id);
    if (!session) return fail('Partida não encontrada.', 404);
    if (session.status !== 'active') return fail('Essa partida já foi encerrada.', 409);

    const inTeams: string[] = [...(session.champion_player_ids || []), ...(session.challenger_player_ids || [])];
    if (!inTeams.every((id) => present.includes(id))) {
      return fail('Quem está em um time não pode sair da lista de presentes.', 400);
    }
    if (!(await allPlayersBelongToGroup(session.group_id, present))) {
      return fail('Tem jogador na lista que não faz parte da liga.', 400);
    }

    const { error } = await supabase
      .from('sessions')
      .update({ present_player_ids: present })
      .eq('id', session.id)
      .eq('status', 'active');

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return fail('Erro ao colocar o atrasado na súmula.', 500);
  }
}
