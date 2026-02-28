import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Faltou o nome da liga na URL' }, { status: 400 });
  }

  try {
    // 1. Acha o ID do grupo baseado no slug (ex: 'amigos-do-volei')
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });
    }

    // 2. Procura se existe uma rodada "ativa" hoje
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', group.id)
      .eq('status', 'active')
      .maybeSingle(); // maybeSingle não quebra se não achar nada (o que é normal quando não tem jogo)

    if (!session) {
      // Quadra livre!
      return NextResponse.json({ session: null, sets: [] });
    }

    // 3. Se tem jogo rolando, busca o placar (os sets que já foram jogados)
    const { data: sets } = await supabase
      .from('sets')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({ session, sets: sets || [] });

  } catch (err) {
    console.error('Erro na API de sessão ativa:', err);
    return NextResponse.json({ error: 'O Yoshi tropeçou nos cabos' }, { status: 500 });
  }
}