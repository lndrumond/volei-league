import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const pin = searchParams.get('pin');

    if (!slug || !pin) {
      return NextResponse.json({ valid: false, error: 'PIN e Slug são obrigatórios.' }, { status: 400 });
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) {
      return NextResponse.json({ valid: false, error: 'Liga não encontrada.' }, { status: 404 });
    }

    // Busca o PIN na tabela voting_pins
    const { data: pinRecord } = await supabase
      .from('voting_pins')
      .select('*')
      .eq('group_id', group.id)
      .eq('pin', pin.trim())
      .single();

    if (!pinRecord) {
      return NextResponse.json({ valid: false, error: 'pin_invalid', message: 'PIN não encontrado na quadra! 🏐❌' });
    }

    if (pinRecord.is_used) {
      return NextResponse.json({ valid: false, error: 'pin_used', message: 'Este PIN já votou! A urna já foi fechada. 🔒' });
    }

    if (new Date(pinRecord.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'pin_expired', message: 'Este PIN expirou! (Validade de 24h) ⏳' });
    }

    // Busca os dados do votante
    const { data: voter } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', pinRecord.player_id)
      .single();

    if (!voter) {
      return NextResponse.json({ valid: false, error: 'voter_not_found', message: 'Votante não encontrado.' });
    }

    // Busca os alvos definidos na tabela voting_targets
    const { data: targetsData } = await supabase
      .from('voting_targets')
      .select('player_id')
      .eq('group_id', group.id);

    const targetIds = (targetsData || []).map((t: { player_id: string }) => t.player_id);

    if (targetIds.length === 0) {
      return NextResponse.json({ valid: false, error: 'no_targets', message: 'Nenhum jogador cadastrado para votação nesta rodada.' });
    }

    // Busca os detalhes dos jogadores alvo
    const { data: targets } = await supabase
      .from('players')
      .select('id, name, is_guest')
      .in('id', targetIds)
      .eq('is_active', true);

    // REMOVE O PRÓPRIO VOTANTE DA LISTA DE ALVOS!
    const filteredTargets = (targets || []).filter((t: { id: string }) => t.id !== voter.id);

    return NextResponse.json({
      valid: true,
      voter: { id: voter.id, name: voter.name },
      targets: filteredTargets,
    });
  } catch (err) {
    return NextResponse.json({ valid: false, error: 'server_error', message: 'Erro ao validar PIN.' }, { status: 500 });
  }
}

