import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Faltou o nome da liga na URL' }, { status: 400 });
  }

  try {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });
    }

    // 1. Procura partida ATIVA
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', group.id)
      .eq('status', 'active')
      .maybeSingle();

    if (activeSession) {
      const { data: sets } = await supabase
        .from('sets')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: true });

      return NextResponse.json({ 
        session: activeSession, 
        activeSession: activeSession, 
        lastEndedSession: null,
        sets: sets || [] 
      });
    }

    // 2. Se a quadra tá livre, procura a ÚLTIMA ENCERRADA
    const { data: lastEndedSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', group.id)
      .eq('status', 'ended')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastEndedSession) {
      // 🚨 AGORA TAMBÉM BUSCAMOS OS SETS DA PARTIDA ENCERRADA PARA O PLACAR 🚨
      const { data: lastSets } = await supabase
        .from('sets')
        .select('*')
        .eq('session_id', lastEndedSession.id)
        .order('created_at', { ascending: true });

      return NextResponse.json({ 
        session: null, 
        activeSession: null, 
        lastEndedSession, 
        sets: lastSets || [] 
      });
    }

    return NextResponse.json({ session: null, activeSession: null, lastEndedSession: null, sets: [] });

  } catch (err) {
    console.error('Erro na API:', err);
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}