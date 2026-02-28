import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { slug, pin } = await request.json();

    if (!slug || !pin) {
      return NextResponse.json({ ok: false, error: 'Slug e PIN são obrigatórios' }, { status: 400 });
    }

    // 1. Busca o grupo e verifica se o PIN bate com o Hash usando a função crypt do próprio Postgres via RPC
    // Vamos usar uma query direta ao banco para delegar a checagem da senha para o Postgres
    const { data: group, error } = await supabase
      .from('groups')
      .select('id, admin_pin_hash, writer_pin_hash')
      .eq('slug', slug)
      .single();

    if (error || !group) {
      return NextResponse.json({ ok: false, error: 'Liga não encontrada' }, { status: 404 });
    }

    // 2. Compara os hashes usando uma consulta SQL no Supabase.
    // O Supabase tem uma função legal chamada `rpc` para rodar lógicas. Mas podemos testar batendo o hash direto:
    const { data: adminMatch } = await supabase.rpc('check_pin', { raw_pin: pin, hashed_pin: group.admin_pin_hash });
    const { data: writerMatch } = await supabase.rpc('check_pin', { raw_pin: pin, hashed_pin: group.writer_pin_hash });

    // CALMA: Como criamos o banco do zero, precisamos ensinar o Supabase a comparar as senhas. 
    // Vou te passar essa função SQL no próximo passo. Por enquanto, assuma que isso funciona!

    let role = 'viewer';
    if (adminMatch) {
      role = 'admin';
    } else if (writerMatch) {
      role = 'writer';
    } else {
      return NextResponse.json({ ok: false, error: 'PIN incorreto' }, { status: 401 });
    }

    // Geramos um token simples base64 para o front-end salvar (em um app real usaríamos JWT)
    const token = Buffer.from(`${slug}-${role}-${Date.now()}`).toString('base64');

    return NextResponse.json({ ok: true, role, token });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Erro no servidor' }, { status: 500 });
  }
}