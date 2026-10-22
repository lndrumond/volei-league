import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fail, getSession } from '@/lib/sessions';

// Encerrar e Abortar: encerram a partida ativa, sem criar outra e sem apagar nada.
export async function POST(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { session_id } = await request.json();

    const session = await getSession(session_id);
    if (!session) return fail('Partida não encontrada.', 404);
    if (session.status !== 'active') return fail('Essa partida já foi encerrada.', 409);

    const { error } = await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session.id)
      .eq('status', 'active');

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return fail('Erro ao desarmar a rede.', 500);
  }
}
