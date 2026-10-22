import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { allPlayersBelongToGroup, cleanIdList, defaultRoundName, fail, getGroupId, hasDuplicates } from '@/lib/sessions';

// Iniciar rodada/partida: sempre cria uma sessão nova. Nunca reaproveita a ativa.
export async function POST(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { slug, present_player_ids, description } = await request.json();

    if (!slug) return fail('Faltou a liga', 400);

    const present = cleanIdList(present_player_ids);
    if (!present) return fail('Lista de presentes inválida.', 400);
    if (hasDuplicates(present)) return fail('Tem jogador repetido na lista de presentes.', 400);

    const groupId = await getGroupId(slug);
    if (!groupId) return fail('Liga não encontrada.', 404);

    if (!(await allPlayersBelongToGroup(groupId, present))) {
      return fail('Tem jogador na lista que não faz parte da liga.', 400);
    }

    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return fail('Já tem uma partida em andamento. Encerre ou use Trocar Times.', 409);
    }

    const name = typeof description === 'string' && description.trim() ? description.trim().slice(0, 80) : defaultRoundName('rodada');

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ group_id: groupId, status: 'active', present_player_ids: present, description: name })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error(err);
    return fail('Erro ao abrir a quadra.', 500);
  }
}
