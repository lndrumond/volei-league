import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { slug, pin, votes } = await request.json();

    if (!slug || !pin || !Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json({ ok: false, error: 'Dados incompletos.' }, { status: 400 });
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) return NextResponse.json({ ok: false, error: 'Liga não encontrada.' }, { status: 404 });

    // Valida o PIN novamente no backend por segurança
    const { data: pinRecord } = await supabase
      .from('voting_pins')
      .select('*')
      .eq('group_id', group.id)
      .eq('pin', pin.trim())
      .single();

    if (!pinRecord || pinRecord.is_used || new Date(pinRecord.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'PIN inválido, expirado ou já utilizado.' }, { status: 400 });
    }

    const voterId = pinRecord.player_id;
    const rowsToInsert = votes.map((v: { target_id: string; score: number }) => ({
      group_id: group.id,
      voter_id: voterId,
      target_id: v.target_id,
      score: Math.min(10, Math.max(1, Math.round(v.score))),
      created_at: new Date().toISOString(),
    }));

    // 1. Salva os votos
    const { error: voteErr } = await supabase
      .from('votes')
      .insert(rowsToInsert);

    if (voteErr) {
      return NextResponse.json({ ok: false, error: 'Erro ao salvar os votos no banco.' }, { status: 500 });
    }

    // 2. Queima o PIN
    await supabase
      .from('voting_pins')
      .update({ is_used: true })
      .eq('id', pinRecord.id);

    // 3. Recalcula a média em tempo real de cada jogador alvo votado
    for (const v of votes) {
      const targetId = v.target_id;

      // Puxa todos os votos históricos do alvo
      const { data: targetVotes } = await supabase
        .from('votes')
        .select('score')
        .eq('group_id', group.id)
        .eq('target_id', targetId);

      if (targetVotes && targetVotes.length > 0) {
        const sum = targetVotes.reduce((acc: number, curr: { score: number }) => acc + curr.score, 0);
        const avg = parseFloat((sum / targetVotes.length).toFixed(2));

        // Atualiza a coluna skill_rating na tabela players
        await supabase
          .from('players')
          .update({ skill_rating: avg })
          .eq('id', targetId);
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Votos computados com sucesso! 🗳️ O segredo está guardado com o Yoshi!',
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Erro interno no servidor.' }, { status: 500 });
  }
}

