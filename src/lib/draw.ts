// Sorteio de times. Equilibra pela soma do skill_rating (oculto) e coloca no máximo 6 por time.
// Quem sobra vai para o banco de areia. Nada aqui é exibido ao usuário.

export const DRAW_MAX_PER_TEAM = 6;

export interface DrawResult {
  champion: string[];
  challenger: string[];
  bench: string[];
}

function shuffle<T>(items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...tail] = arr;
  return [...combinations(tail, k - 1).map((c) => [head, ...c]), ...combinations(tail, k)];
}

export function drawTeams(ids: string[], skillOf: (id: string) => number): DrawResult {
  const shuffled = shuffle(ids);
  const limit = DRAW_MAX_PER_TEAM * 2;
  const playing = shuffled.slice(0, limit);
  const bench = shuffled.slice(limit);

  const sizeA = Math.floor(playing.length / 2);
  const total = playing.reduce((acc, id) => acc + skillOf(id), 0);

  const candidates = combinations(playing, sizeA).map((teamA) => {
    const sumA = teamA.reduce((acc, id) => acc + skillOf(id), 0);
    return { teamA, diff: Math.abs(sumA - (total - sumA)) };
  });

  // Entre as formações de menor diferença (com 0,5 de tolerância), sorteia uma.
  const minDiff = Math.min(...candidates.map((c) => c.diff));
  const best = candidates.filter((c) => c.diff <= minDiff + 0.5);
  const chosen = best[Math.floor(Math.random() * best.length)];

  const teamA = chosen.teamA;
  const teamB = playing.filter((id) => !teamA.includes(id));

  // Moeda: quem fica com Sem Colete.
  const flip = Math.random() > 0.5;
  return { champion: flip ? teamB : teamA, challenger: flip ? teamA : teamB, bench };
}
