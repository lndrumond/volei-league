import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function generatePin(): string {
  // Gera PIN de 4 dígitos (ex: 4921)
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function GET(request: Request) {
  const auth = requireRole(request, 'superadmin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) return NextResponse.json({ error: 'Faltou o slug.' }, { status: 400 });

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });

    // Puxa apenas jogadores fixos
    const { data: fixos } = await supabase
      .from('players')
      .select('id, name')
      .eq('group_id', group.id)
      .eq('is_guest', false)
      .eq('is_active', true)
      .order('name');

    if (!fixos) return NextResponse.json({ voters: [] });

    // Puxa PINs da liga
    const { data: pins } = await supabase
      .from('voting_pins')
      .select('id, player_id, pin, expires_at, is_used')
      .eq('group_id', group.id);

    const pinsMap: Record<string, { pin: string; expires_at: string; is_used: boolean }> = {};
    if (pins) {
      // Pega o PIN mais recente de cada player
      pins.forEach((p: { player_id: string; pin: string; expires_at: string; is_used: boolean }) => {
        pinsMap[p.player_id] = {
          pin: p.pin,
          expires_at: p.expires_at,
          is_used: p.is_used,
        };
      });
    }

    const now = new Date();

    const voters = fixos.map((player: { id: string; name: string }) => {
      const pinInfo = pinsMap[player.id];
      let status: 'NO_PIN' | 'PENDING' | 'VOTED' | 'EXPIRED' = 'NO_PIN';
      let currentPin: string | null = null;

      if (pinInfo) {
        currentPin = pinInfo.pin;
        if (pinInfo.is_used) {
          status = 'VOTED';
        } else if (new Date(pinInfo.expires_at) < now) {
          status = 'EXPIRED';
        } else {
          status = 'PENDING';
        }
      }

      return {
        id: player.id,
        name: player.name,
        status,
        pin: currentPin,
        expires_at: pinInfo?.expires_at || null,
      };
    });

    return NextResponse.json({ ok: true, voters });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = requireRole(request, 'superadmin');
  if (isErrorResponse(auth)) return auth;

  try {
    const { slug, player_ids } = await request.json();

    if (!slug || !Array.isArray(player_ids) || player_ids.length === 0) {
      return NextResponse.json({ error: 'Selecione pelo menos 1 Fixo.' }, { status: 400 });
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const createdPins: Array<{ player_id: string; pin: string }> = [];

    for (const playerId of player_ids) {
      const newPin = generatePin();

      // Deleta PIN antigo se houver
      await supabase
        .from('voting_pins')
        .delete()
        .eq('group_id', group.id)
        .eq('player_id', playerId);

      // Insere novo PIN
      const { error: insErr } = await supabase
        .from('voting_pins')
        .insert({
          group_id: group.id,
          player_id: playerId,
          pin: newPin,
          expires_at: expiresAt,
          is_used: false,
        });

      if (!insErr) {
        createdPins.push({ player_id: playerId, pin: newPin });
      }
    }

    return NextResponse.json({ ok: true, created: createdPins });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}

