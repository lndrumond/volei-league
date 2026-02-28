import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  const { slug, note, present_player_ids } = await request.json();

  const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      group_id: group.id,
      note,
      present_player_ids
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Erro ao criar rodada' }, { status: 500 });
  return NextResponse.json({ ok: true, session });
}