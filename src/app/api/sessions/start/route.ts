import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // 🚨 AQUI ESTAVA O ERRO! Adicionei o "present_player_ids" para a API ler a lista
    const { slug, present_player_ids } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });
    }

    // Busca o ID do grupo
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    // Leão de chácara do TypeScript (impede a Vercel de travar)
    if (!group) {
      return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });
    }

    // Insere a rodada no banco já com os jogadores marcados!
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ 
        group_id: group!.id, 
        status: 'active',
        present_player_ids: present_player_ids || [] // 🚨 SALVA OS CHECKBOXES!
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao abrir a quadra.' }, { status: 500 });
  }
}