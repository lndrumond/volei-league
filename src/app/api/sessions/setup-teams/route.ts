import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  MAX_PER_TEAM, allPlayersBelongToGroup, cleanIdList, countSets, fail, getSession, hasDuplicates,
} from '@/lib/sessions';

// Grava os times da partida ativa. Só aceita times válidos e só antes do primeiro set.
export async function POST(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { session_id, champion_name, challenger_name, description } = body;

    if (!session_id || !champion_name || !challenger_name) {
      return fail('Faltou o nome dos times ou o ID da partida.', 400);
    }

    const champion = cleanIdList(body.champion_player_ids);
    const challenger = cleanIdList(body.challenger_player_ids);
    if (!champion || !challenger) return fail('Lista de jogadores inválida.', 400);
    if (champion.length === 0 || challenger.length === 0) return fail('Os dois times precisam ter jogador.', 400);

    if (hasDuplicates(champion) || hasDuplicates(challenger)) {
      return fail('Tem jogador repetido dentro de um time.', 400);
    }
    if (champion.some((id) => challenger.includes(id))) {
      return fail('Tem jogador nos dois times.', 400);
    }
    if (champion.length > MAX_PER_TEAM || challenger.length > MAX_PER_TEAM) {
      return fail(`Cada time aceita no máximo ${MAX_PER_TEAM} jogadores.`, 400);
    }

    const session = await getSession(session_id);
    if (!session) return fail('Partida não encontrada.', 404);
    if (session.status !== 'active') return fail('Essa partida já foi encerrada. Use Trocar Times.', 409);
    if ((await countSets(session.id)) > 0) {
      return fail('Essa partida já tem set anotado. Para mudar os times, use Trocar Times.', 409);
    }

    // Presentes: os enviados agora ou, se não vierem, os que já estão na partida.
    const sentPresent = cleanIdList(body.present_player_ids);
    if (!sentPresent) return fail('Lista de presentes inválida.', 400);
    const present = body.present_player_ids === undefined ? (session.present_player_ids || []) : sentPresent;
    if (hasDuplicates(present)) return fail('Tem jogador repetido na lista de presentes.', 400);

    const inTeams = [...champion, ...challenger];
    if (!inTeams.every((id) => present.includes(id))) {
      return fail('Todo jogador dos times precisa estar na lista de presentes.', 400);
    }
    if (!(await allPlayersBelongToGroup(session.group_id, present))) {
      return fail('Tem jogador na lista que não faz parte da liga.', 400);
    }

    const update: Record<string, unknown> = {
      champion_name,
      challenger_name,
      champion_player_ids: champion,
      challenger_player_ids: challenger,
      present_player_ids: present,
    };
    if (typeof description === 'string' && description.trim()) update.description = description.trim().slice(0, 80);

    const { data: updated, error } = await supabase
      .from('sessions')
      .update(update)
      .eq('id', session.id)
      .eq('status', 'active')
      .select()
      .single();

    if (error) {
      console.error('Erro no Supabase:', error);
      return fail('Erro ao salvar os times na areia.', 500);
    }

    return NextResponse.json({ ok: true, session: updated });
  } catch (err) {
    console.error('Erro catastrofico na API de setup:', err);
    return fail('O Yoshi engoliu o apito.', 500);
  }
}
