import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { session_id, winner } = await request.json();
    
    if (!session_id || !winner) {
      return NextResponse.json({ error: 'Faltou o ID da sessão ou o vencedor.' }, { status: 400 });
    }

    const { data: newSet, error } = await supabase
      .from('sets')
      .insert({ session_id, winner })
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ ok: true, set: newSet });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'O Yoshi engoliu a caneta! Erro ao anotar.' }, { status: 500 });
  }
}