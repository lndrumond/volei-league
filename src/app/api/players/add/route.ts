import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // 🚨 AGORA A API RECEBE O is_guest DA TELA
    const { slug, name, is_guest } = await request.json();

    if (!slug || !name) {
      return NextResponse.json({ error: 'Faltam dados.' }, { status: 400 });
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });
    }

    // Define como verdadeiro apenas se a tela mandar true, senão vira Fixo (false)
    const guestValue = is_guest !== undefined ? is_guest : true;

    const { data: player, error } = await supabase
      .from('players')
      .insert({ group_id: group!.id, name, is_guest: guestValue, is_active: true })
      .select('id, name, is_guest')
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, player });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao convocar o visitante.' }, { status: 500 });
  }
}