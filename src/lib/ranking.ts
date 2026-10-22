export interface RankingEntry { name: string; points: number; is_guest?: boolean }

export interface RankGroup {
  position: number; // 1, 1, 3: empatados dividem a posição e a seguinte pula
  points: number;
  players: RankingEntry[]; // em ordem alfabética
}

export const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * Agrupa por pontuação: cada grupo é uma posição, com os empatados em ordem alfabética.
 * A posição é 1 + quantos jogadores têm mais pontos (por isso 1, 1, 3).
 */
export function groupRanking(entries: RankingEntry[]): RankGroup[] {
  const sorted = [...entries].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'pt-BR'));
  const groups: RankGroup[] = [];
  sorted.forEach((p, i) => {
    const last = groups[groups.length - 1];
    if (last && last.points === p.points) last.players.push(p);
    else groups.push({ position: i + 1, points: p.points, players: [p] });
  });
  return groups;
}

export const TOP5_MAX_NAMES_LAST = 3;

// Top 5: as 5 primeiras posições. As 4 primeiras mostram todos os empatados; a 5ª mostra até 3 e quantos ficaram de fora.
export function top5(entries: RankingEntry[]): (RankGroup & { shown: RankingEntry[]; more: number })[] {
  return groupRanking(entries)
    .slice(0, 5)
    .map((g, i) => {
      const limited = i === 4 && g.players.length > TOP5_MAX_NAMES_LAST;
      return {
        ...g,
        shown: limited ? g.players.slice(0, TOP5_MAX_NAMES_LAST) : g.players,
        more: limited ? g.players.length - TOP5_MAX_NAMES_LAST : 0,
      };
    });
}
