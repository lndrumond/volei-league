import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: 'Faltou a liga' }, { status: 400 });
    }

    // Busca o ID do grupo
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    // 🚨 A CORREÇÃO AQUI: Garante que o grupo existe antes de tentar criar a rodada!
    if (!group) {
      return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });
    }

    // Agora é seguro usar o group.id (coloquei a exclamação por garantia extrema)
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({ group_id: group!.id, status: 'active' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao abrir a quadra.' }, { status: 500 });
  }
}