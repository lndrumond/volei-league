import { supabase } from '@/lib/supabase';
import { monthKeyOf } from '@/lib/brMonth';

export interface PlayerLite { id: string; name: string; is_guest: boolean | null }

/**
 * Pontos de cada jogador por mês (horário de Brasília). Cada set ganho vale +1 para cada jogador do time vencedor.
 * O mês é o da data do set (ou da partida, se o set não tiver data): jogo registrado depois conta no mês do registro.
 * Fominha: partidas em que o jogador foi escalado (num time), por mês da partida. Não depende de set anotado.
 */
export async function loadMonthlyPoints(groupId: string) {
  const { data: players, error: pErr } = await supabase.from('players').select('id, name, is_guest').eq('group_id', groupId);
  if (pErr) throw pErr;

  // O Supabase devolve no máximo 1000 linhas por chamada: busca em páginas.
  const sessions: { created_at: string; champion_player_ids: string[] | null; challenger_player_ids: string[] | null; sets: { winner: string; created_at: string | null }[] | null }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('sessions')
      .select('id, created_at, champion_player_ids, challenger_player_ids, sets(id, winner, created_at)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    sessions.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }

  const byMonth = new Map<string, Record<string, number>>();
  const gamesByMonth = new Map<string, Record<string, number>>();
  const known = new Set((players || []).map((p) => p.id));

  for (const s of sessions) {
    const champ = s.champion_player_ids || [];
    const chall = s.challenger_player_ids || [];
    for (const set of s.sets || []) {
      const key = monthKeyOf(set.created_at || s.created_at);
      const pts = byMonth.get(key) || {};
      for (const id of set.winner === 'champion' ? champ : chall) {
        if (known.has(id)) pts[id] = (pts[id] || 0) + 1;
      }
      byMonth.set(key, pts);
    }

    // Uma partida conta 1 para cada jogador escalado num dos times (um jogador só conta uma vez por partida).
    const gameKey = monthKeyOf(s.created_at);
    const games = gamesByMonth.get(gameKey) || {};
    for (const id of new Set([...champ, ...chall])) {
      if (known.has(id)) games[id] = (games[id] || 0) + 1;
    }
    gamesByMonth.set(gameKey, games);
  }

  return { players: (players || []) as PlayerLite[], byMonth, gamesByMonth };
}
