'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// --- TIPAGENS ---
export type Role = 'admin' | 'viewer';

export interface Player {
  id: string;
  name: string;
}

export interface SessionData {
  id: string;
  champion_name?: string;
  challenger_name?: string;
  present_player_ids?: string[];
}

// --- FUNÇÕES DE AUTH (LocalStorage) ---
export const getStoredToken = (slug: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`avl_token_${slug}`);
};

export const getStoredRole = (slug: string): Role => {
  if (typeof window === 'undefined') return 'viewer';
  // Token antigo (sem assinatura, formato base64 sem ponto) não vale mais: pede o PIN de novo.
  const token = localStorage.getItem(`avl_token_${slug}`);
  if (token && !token.includes('.')) {
    clearAuth(slug);
    return 'viewer';
  }
  const role = localStorage.getItem(`avl_role_${slug}`);
  if (token && role === 'admin') return 'admin';
  return 'viewer';
};

// Avisa a barra inferior (e quem mais ouvir) que o login mudou, sem precisar recarregar a página.
export const AUTH_EVENT = 'avl-auth';
export const notifyAuthChange = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_EVENT));
};

export const saveAuth = (slug: string, token: string, role: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`avl_token_${slug}`, token);
  localStorage.setItem(`avl_role_${slug}`, role);
  notifyAuthChange();
};

export const clearAuth = (slug: string) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`avl_token_${slug}`);
  localStorage.removeItem(`avl_role_${slug}`);
  notifyAuthChange();
};

// --- FETCH HELPER (Intercepta erros 401 de PIN inválido/expirado) ---
export const apiFetch = async (slug: string, endpoint: string, init?: RequestInit) => {
  const token = getStoredToken(slug);
  const headers = new Headers(init?.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, { ...init, headers });

  if (response.status === 401) {
    clearAuth(slug);
    throw new Error('401_UNAUTHORIZED');
  }

  return response;
};

// --- HOOK DE ESTADO DE AUTH ---
export function useAVLAuth(slug: string) {
  const [role, setRole] = useState<Role>('viewer');
  const [token, setToken] = useState<string | null>(null);
  
  const refreshAuth = useCallback(() => {
    setRole(getStoredRole(slug));
    setToken(getStoredToken(slug));
  }, [slug]);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return { token, role, refreshAuth };
}

// --- JANELA DO PIN ---
interface PinModalProps {
  slug: string;
  requiredRole: 'admin';
  onSuccess: () => void;
  onClose: () => void;
}

export function PinModal({ slug, requiredRole, onSuccess, onClose }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin }),
      });
      const data = await res.json();

      if (data.ok && data.role === requiredRole) {
        saveAuth(slug, data.token, data.role);
        onSuccess();
      } else if (res.status === 401) {
        setError('PIN incorreto! A bola foi na rede. 🏐');
      } else {
        setError(data.error || 'Não deu certo. Tenta de novo.');
      }
    } catch {
      setError('Erro no servidor! Tenta de novo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="PIN do admin">
      <form onSubmit={handleValidate} className="flex flex-col gap-3">
        <p className="text-muted">Digite o PIN para liberar as ações do admin neste aparelho.</p>
        <label htmlFor="pin" className="sr-only">PIN</label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          maxLength={8}
          placeholder="••••••"
          className="text-center text-3xl font-display font-bold tracking-[0.3em] p-3 rounded-[16px] bg-surface2 border-[3px] border-line text-ink"
        />
        {error && <p role="alert" className="font-bold text-danger">{error}</p>}
        <Button type="submit" variant="sun" disabled={loading || !pin}>{loading ? 'Conferindo...' : 'Liberar'}</Button>
        <Button type="button" size="sm" onClick={onClose}>Voltar</Button>
      </form>
    </Modal>
  );
}
