import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const MAX_PER_TEAM = 7;

const TZ = 'America/Sao_Paulo';

// Data curta em Brasília (ex.: 22/10), independente do fuso do servidor.
export function brasiliaDate(date: Date = new Date()): string {
  return date.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
}

export function defaultRoundName(kind: 'rodada' | 'troca'): string {
  return `${kind === 'rodada' ? 'Rodada' : 'Troca de time'} · ${brasiliaDate()}`;
}

export function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// Lista de ids: só textos, sem repetição. Devolve null se o formato for inválido.
export function cleanIdList(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  if (!value.every((v) => typeof v === 'string' && v.length > 0)) return null;
  return value as string[];
}

export function hasDuplicates(ids: string[]): boolean {
  return new Set(ids).size !== ids.length;
}

export async function getGroupId(slug: string): Promise<string | null> {
  const { data } = await supabase.from('groups').select('id').eq('slug', slug).single();
  return data?.id ?? null;
}

// Confere se todos os ids são jogadores ativos da liga.
export async function allPlayersBelongToGroup(groupId: string, ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const { data } = await supabase
    .from('players')
    .select('id')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .in('id', ids);
  return (data?.length ?? 0) === new Set(ids).size;
}

export async function getSession(sessionId: unknown) {
  if (typeof sessionId !== 'string' || !sessionId) return null;
  const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).maybeSingle();
  return data;
}

export async function countSets(sessionId: string): Promise<number> {
  const { count } = await supabase
    .from('sets')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId);
  return count ?? 0;
}
