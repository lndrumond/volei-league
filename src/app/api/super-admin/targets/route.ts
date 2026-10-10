import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) return NextResponse.json({ error: 'Faltou o slug da liga.' }, { status: 400 });

    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (groupErr || !group) {
      console.error('❌ [SuperAdmin Targets] Grupo não encontrado para slug:', slug, groupErr);
      return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });
    }

    // Busca todos os jogadores da liga
    const { data: players, error: playersErr } = await supabase
      .from('players')
      .select('id, name, is_guest, skill_rating')
      .eq('group_id', group.id)
      .eq('is_active', true)
      .order('name');

    if (playersErr) {
      console.error('❌ [SuperAdmin Targets] Erro ao buscar jogadores:', playersErr);
      return NextResponse.json({ error: 'Erro ao buscar jogadores.' }, { status: 500 });
    }

    // Busca os alvos atuais da votação
    const { data: targets, error: targetsErr } = await supabase
      .from('voting_targets')
      .select('player_id')
      .eq('group_id', group.id);

    const targetPlayerIds = (targets || []).map((t: { player_id: string }) => t.player_id);

    return NextResponse.json({
      ok: true,
      players: players || [],
      target_player_ids: targetPlayerIds,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { slug, target_player_ids } = await request.json();

    if (!slug || !Array.isArray(target_player_ids)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .eq('slug', slug)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Liga não encontrada.' }, { status: 404 });
    }

    // Remove alvos antigos do grupo
    await supabase
      .from('voting_targets')
      .delete()
      .eq('group_id', group.id);

    // Insere os novos alvos
    if (target_player_ids.length > 0) {
      const rowsToInsert = target_player_ids.map((pid: string) => ({
        group_id: group.id,
        player_id: pid,
      }));

      const { error: insertErr } = await supabase
        .from('voting_targets')
        .insert(rowsToInsert);

      if (insertErr) {
        return NextResponse.json({ error: 'Erro ao salvar alvos.' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, count: target_player_ids.length });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}

