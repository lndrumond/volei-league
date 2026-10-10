import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD || 'avl2026';

    if (password === expectedPassword) {
      const token = Buffer.from(`superadmin-${Date.now()}`).toString('base64');
      return NextResponse.json({ ok: true, token });
    }

    return NextResponse.json({ ok: false, error: 'Senha incorreta do Super Admin.' }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Erro no servidor.' }, { status: 500 });
  }
}

