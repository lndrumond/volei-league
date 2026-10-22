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

    // 1. Partida ativa (se houver) e seus sets
    const { data: activeSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', group.id)
      .eq('status', 'active')
      .maybeSingle();

    let activeSets: unknown[] = [];
    if (activeSession) {
      const { data: sets } = await supabase
        .from('sets')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('created_at', { ascending: true });
      activeSets = sets || [];
    }

    // 2. Último confronto: a última partida encerrada que teve times e pelo menos um set.
    //    Ele continua existindo enquanto há uma partida em andamento (o Dashboard mostra os dois).
    const { data: recent } = await supabase
      .from('sessions')
      .select('*, sets(*)')
      .eq('group_id', group.id)
      .eq('status', 'ended')
      .not('champion_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    const last = (recent || []).find((s: { sets?: unknown[] }) => (s.sets?.length ?? 0) > 0) || null;
    const lastSets = last
      ? [...(last.sets as { created_at: string }[])].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      : [];
    const lastEndedSession = last ? { ...last, sets: undefined } : null;

    return NextResponse.json({
      session: activeSession || null,
      activeSession: activeSession || null,
      lastEndedSession,
      lastSets,
      // `sets` mantém o formato antigo: os sets da partida ativa ou, sem ela, os do último confronto.
      sets: activeSession ? activeSets : lastSets,
    });
  } catch (err) {
    console.error('Erro na API:', err);
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
