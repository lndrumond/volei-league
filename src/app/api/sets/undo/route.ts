import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { fail, getSession } from '@/lib/sessions';

export async function POST(request: Request) {
  const auth = requireRole(request, 'admin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { session_id } = await request.json();

    // Única exceção à regra de nunca apagar sets: só o último set de uma partida ainda ativa.
    const session = await getSession(session_id);
    if (!session) return fail('Partida não encontrada.', 404);
    if (session.status !== 'active') return fail('Essa partida já foi encerrada.', 409);

    // 1. Acha o ID do ÚLTIMO set que foi jogado nessa sessão
    const { data: lastSet, error: fetchError } = await supabase
      .from('sets')
      .select('id')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !lastSet) {
      return NextResponse.json({ error: 'Não tem nenhum set pra desfazer!' }, { status: 400 });
    }

    // 2. Apaga esse set
    const { error: deleteError } = await supabase
      .from('sets')
      .delete()
      .eq('id', lastSet.id);

    if (deleteError) throw deleteError;
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao apagar o histórico na areia.' }, { status: 500 });
  }
}