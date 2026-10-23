// Meses no horário de Brasília (UTC-3, sem horário de verão desde 2019). O banco guarda em UTC.
// Chave do mês: "AAAA-MM".
const OFFSET_MS = 3 * 60 * 60 * 1000;

export const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Mês (em Brasília) a que um instante pertence. */
export function monthKeyOf(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getTime() - OFFSET_MS).toISOString().slice(0, 7);
}

export const currentMonthKey = (now: Date = new Date()) => monthKeyOf(now);

/** Soma (ou subtrai) meses de uma chave. */
export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Primeiro instante do mês: dia 1 às 00:00 em Brasília. */
export const monthStart = (key: string) => new Date(`${key}-01T00:00:00-03:00`);

/** "setembro de 2026" */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' });
}

/** "set/2026" */
export function monthShort(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const mes = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'short' }).replace('.', '');
  return `${mes}/${y}`;
}

/** Só o nome do mês: "setembro" */
export function monthName(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'long' });
}
