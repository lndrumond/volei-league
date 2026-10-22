import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { signToken } from '@/lib/auth';

function samePassword(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  try {
    const { slug, password } = await request.json();
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;

    // Sem senha configurada no ambiente, o Super Admin fica fechado (não existe senha padrão).
    if (!expectedPassword) {
      return NextResponse.json({ ok: false, error: 'Super Admin não configurado no servidor.' }, { status: 500 });
    }

    if (typeof password === 'string' && samePassword(password, expectedPassword)) {
      const token = signToken('superadmin', typeof slug === 'string' ? slug : '');
      if (!token) {
        return NextResponse.json({ ok: false, error: 'Servidor sem segredo de autenticação configurado.' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, token });
    }

    return NextResponse.json({ ok: false, error: 'Senha incorreta do Super Admin.' }, { status: 401 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: 'Erro no servidor.' }, { status: 500 });
  }
}
