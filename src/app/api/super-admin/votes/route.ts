import { NextResponse } from 'next/server';
import { requireRole, isErrorResponse } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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

    // Puxa histórico de votos
    const { data: votes, error: votesErr } = await supabase
      .from('votes')
      .select(`
        id,
        score,
        created_at,
        voter:voter_id (id, name),
        target:target_id (id, name)
      `)
      .eq('group_id', group.id)
      .order('created_at', { ascending: false });

    if (votesErr) {
      // Caso o join do supabase precise de relacionamentos explícitos, fazemos a busca em 2 passos
      const { data: rawVotes } = await supabase
        .from('votes')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: false });

      if (!rawVotes || rawVotes.length === 0) {
        return NextResponse.json({ ok: true, votes: [] });
      }

      const { data: players } = await supabase
        .from('players')
        .select('id, name')
        .eq('group_id', group.id);

      const pMap: Record<string, string> = {};
      (players || []).forEach((p: { id: string; name: string }) => {
        pMap[p.id] = p.name;
      });

      const formatted = rawVotes.map((v: { id: string; voter_id: string; target_id: string; score: number; created_at: string }) => ({
        id: v.id,
        voter_name: pMap[v.voter_id] || 'Desconhecido',
        target_name: pMap[v.target_id] || 'Desconhecido',
        score: v.score,
        created_at: v.created_at,
      }));

      return NextResponse.json({ ok: true, votes: formatted });
    }

    const formatted = (votes || []).map((v: any) => ({
      id: v.id,
      voter_name: v.voter?.name || 'Desconhecido',
      target_name: v.target?.name || 'Desconhecido',
      score: v.score,
      created_at: v.created_at,
    }));

    return NextResponse.json({ ok: true, votes: formatted });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

