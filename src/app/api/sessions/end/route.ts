import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { session_id } = await request.json();
    
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', session_id);

    if (error) throw error;
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao desarmar a rede.' }, { status: 500 });
  }
}