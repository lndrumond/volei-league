import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { slug, name } = await request.json();
    
    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    
    // Todo mundo que é adicionado pela tela na hora do jogo, o sistema salva is_guest = true!
    const { data: player, error } = await supabase
      .from('players')
      .insert({ group_id: group.id, name, is_guest: true })
      .select('id, name, is_guest')
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, player });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao adicionar' }, { status: 500 });
  }
}