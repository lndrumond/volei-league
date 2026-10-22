import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCallerRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) return NextResponse.json({ error: 'Faltou o nome da liga na URL.' }, { status: 400 });

    const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();
    if (!group) return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });

    // Vêm também os inativos, para o histórico e o placar mostrarem o nome certo. A prancheta esconde os inativos.
    const { data: players } = await supabase
      .from('players')
      .select('id, name, is_guest, is_active, skill_rating')
      .eq('group_id', group.id)
      .order('name');

    // O rating é oculto: só quem está logado como admin recebe (o sorteio usa).
    if (!getCallerRole(request)) {
      return NextResponse.json({ players: (players || []).map(({ skill_rating, ...rest }) => rest) });
    }

    return NextResponse.json({ players: players || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}