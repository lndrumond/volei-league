export const CHAMPION_NAME = 'Sem Colete';
export const CHALLENGER_NAME = 'Com Colete';

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// Apelidos que aparecem nos nomes de times antigos e o cadastro a que correspondem.
const CAPTAIN_ALIASES: Record<string, string> = {
  ti: 'ti lu',
  tia: 'tia kk',
};

// "Sem Colete (Cap: Ana)" -> "Sem Colete"
export function baseTeamName(name?: string | null): string {
  return (name || '').split(' (Cap:')[0].trim();
}

// "Sem Colete (Cap: Ana)" -> "Ana"
function captainText(name?: string | null): string | null {
  const m = (name || '').match(/\(Cap:\s*(.+?)\)\s*$/);
  return m ? m[1].trim() : null;
}

/**
 * Descobre quem é o capitão do time pelo texto do nome do time.
 * Devolve o id do jogador cadastrado, para exibir sempre o nome certo (ex.: "Tia kk", "Ti Lu").
 */
export function resolveCaptainId(
  teamName: string | null | undefined,
  teamIds: string[] | null | undefined,
  playersMap: Record<string, string>,
): string | null {
  const text = captainText(teamName);
  const ids = teamIds || [];
  if (!text || ids.length === 0) return null;

  const target = norm(text);
  const aliased = CAPTAIN_ALIASES[target];
  const nameOf = (id: string) => norm(playersMap[id] || '');

  return (
    ids.find((id) => nameOf(id) === target) ||
    (aliased ? ids.find((id) => nameOf(id) === aliased) : undefined) ||
    ids.find((id) => nameOf(id).split(' ')[0] === target.split(' ')[0]) ||
    null
  );
}

// Lista de nomes sem repetidos, com o capitão primeiro.
export function lineupNames(
  teamName: string | null | undefined,
  teamIds: string[] | null | undefined,
  playersMap: Record<string, string>,
): { name: string; captain: boolean }[] {
  const unique = Array.from(new Set(teamIds || []));
  const cap = resolveCaptainId(teamName, unique, playersMap);
  const ordered = cap ? [cap, ...unique.filter((id) => id !== cap)] : unique;
  return ordered.map((id) => ({ name: playersMap[id] || 'Jogador', captain: id === cap }));
}

// Texto gravado no nome do time. Usa o nome completo cadastrado, para o capitão ser sempre achado.
export function teamNameWithCaptain(base: string, captainName?: string | null): string {
  return captainName ? `${base} (Cap: ${captainName})` : base;
}

export function countSets(sets: { winner: string }[]): [number, number] {
  return [
    sets.filter((s) => s.winner === 'champion').length,
    sets.filter((s) => s.winner === 'challenger').length,
  ];
}
