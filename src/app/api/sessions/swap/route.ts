import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { defaultRoundName, fail, getSession } from '@/lib/sessions';

// Trocar Times: encerra a partida ativa (com os sets já ganhos) e abre outra,
// com placar zerado e os mesmos presentes.
export async function POST(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { session_id } = await request.json();

    const current = await getSession(session_id);
    if (!current) return fail('Partida não encontrada.', 404);
    if (current.status !== 'active') return fail('Essa partida já foi encerrada.', 409);

    // Encerra só se ainda estiver ativa (evita encerrar duas vezes em toques repetidos).
    const { data: ended, error: endError } = await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', current.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (endError) throw endError;
    if (!ended) return fail('Essa partida já foi encerrada.', 409);

    const { data: next, error: insertError } = await supabase
      .from('sessions')
      .insert({
        group_id: current.group_id,
        status: 'active',
        present_player_ids: current.present_player_ids || [],
        description: defaultRoundName('troca'),
      })
      .select()
      .single();

    if (insertError || !next) {
      // Não deixa a quadra sem partida: reabre a anterior.
      console.error('Falha ao criar a nova partida na troca; reabrindo a anterior.', insertError);
      await supabase.from('sessions').update({ status: 'active', ended_at: null }).eq('id', current.id);
      return fail('Não deu pra trocar os times. A partida continua como estava.', 500);
    }

    return NextResponse.json({ ok: true, session: next });
  } catch (err) {
    console.error(err);
    return fail('Erro ao trocar os times.', 500);
  }
}
