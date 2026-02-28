import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) return NextResponse.json({ error: 'Faltou o nome da liga na URL.' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });

    // Agora a gente pede pro banco trazer a coluna is_guest também!
    const { data: players } = await supabase
      .from('players')
      .select('id, name, is_guest')
      .eq('group_id', group.id)
      .eq('is_active', true)
      .order('name');

    return NextResponse.json({ players: players || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}