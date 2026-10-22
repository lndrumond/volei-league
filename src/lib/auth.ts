import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

export type ServerRole = 'admin' | 'superadmin';

interface TokenPayload {
  role: ServerRole;
  slug: string;
  exp: number; // epoch em segundos
}

// Quem digita o PIN uma vez fica como admin no aparelho, então o token dura bastante.
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180;

// O segredo vem só do ambiente. Sem ele, nada é assinado nem aceito (não há valor padrão).
function getSecret(): string | null {
  const secret = process.env.AUTH_TOKEN_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function signToken(role: ServerRole, slug: string): string | null {
  const secret = getSecret();
  if (!secret) {
    console.error('AUTH_TOKEN_SECRET ausente ou curto demais (mínimo 16 caracteres).');
    return null;
  }
  const payload: TokenPayload = { role, slug, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function verifyToken(token: string | null | undefined): TokenPayload | null {
  const secret = getSecret();
  if (!secret || !token) return null;

  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(body, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (payload.role !== 'admin' && payload.role !== 'superadmin') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Exige um papel mínimo. O Super Admin faz tudo que o admin faz.
 * Retorna o payload quando liberado, ou a resposta de erro pronta para devolver.
 */
export function requireRole(request: Request, minRole: ServerRole): TokenPayload | NextResponse {
  if (!getSecret()) {
    return NextResponse.json({ error: 'Servidor sem segredo de autenticação configurado.' }, { status: 500 });
  }

  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: 'Sessão inválida ou expirada. Digite o PIN de novo.' }, { status: 401 });
  }
  if (minRole === 'superadmin' && payload.role !== 'superadmin') {
    return NextResponse.json({ error: 'Só o Super Admin pode fazer isso.' }, { status: 403 });
  }
  return payload;
}

export function isErrorResponse(value: TokenPayload | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

// Papel de quem chama, sem bloquear (para leituras públicas que mudam conforme o papel).
export function getCallerRole(request: Request): ServerRole | null {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  return verifyToken(token)?.role ?? null;
}
