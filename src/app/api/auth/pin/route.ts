import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { slug, pin } = await request.json();

    if (!slug || !pin) {
      return NextResponse.json({ ok: false, error: 'Slug e PIN são obrigatórios' }, { status: 400 });
    }

    const { data: group, error } = await supabase
      .from('groups')
      .select('id, admin_pin_hash')
      .eq('slug', slug)
      .single();

    if (error || !group) {
      return NextResponse.json({ ok: false, error: 'Liga não encontrada' }, { status: 404 });
    }

    // A comparação do PIN com o hash é feita pelo Postgres (função check_pin).
    const { data: adminMatch } = await supabase.rpc('check_pin', { raw_pin: String(pin), hashed_pin: group.admin_pin_hash });

    if (!adminMatch) {
      return NextResponse.json({ ok: false, error: 'PIN incorreto' }, { status: 401 });
    }

    const token = signToken('admin', slug);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Servidor sem segredo de autenticação configurado.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, role: 'admin', token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Erro no servidor' }, { status: 500 });
  }
}
