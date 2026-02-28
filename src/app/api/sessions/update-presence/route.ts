import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { session_id, present_player_ids } = await request.json();
    
    const { error } = await supabase
      .from('sessions')
      .update({ present_player_ids })
      .eq('id', session_id);

    if (error) throw error;
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao colocar o atrasado na súmula.' }, { status: 500 });
  }
}