import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { session_id } = await request.json();

    // 1. Acha o ID do ÚLTIMO set que foi jogado nessa sessão
    const { data: lastSet, error: fetchError } = await supabase
      .from('sets')
      .select('id')
      .eq('session_id', session_id)
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