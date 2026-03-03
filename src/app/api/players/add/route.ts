import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { slug, name } = await request.json();

    if (!slug || !name) {
      return NextResponse.json({ error: 'Faltam dados para adicionar o jogador.' }, { status: 400 });
    }

    // Busca o ID do grupo
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    // 🚨 AQUI ESTÁ A CORREÇÃO QUE A VERCEL QUERIA 🚨
    // Garantimos pro TypeScript que o group existe! Se não existir, a gente barra aqui.
    if (!group) {
      return NextResponse.json({ error: 'Liga não encontrada na areia.' }, { status: 404 });
    }

    // Agora o TypeScript sabe que é seguro usar o group.id
    const { data: player, error } = await supabase
      .from('players')
      .insert({ group_id: group.id, name, is_guest: true, is_active: true })
      .select('id, name, is_guest')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, player });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao convocar o visitante.' }, { status: 500 });
  }
}