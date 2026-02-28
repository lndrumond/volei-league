'use client';

import { useState, useEffect, useCallback } from 'react';

// --- TIPAGENS ---
export type Role = 'admin' | 'writer' | 'viewer';

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
  const role = localStorage.getItem(`avl_role_${slug}`);
  if (role === 'admin' || role === 'writer') return role;
  return 'viewer';
};

export const saveAuth = (slug: string, token: string, role: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`avl_token_${slug}`, token);
  localStorage.setItem(`avl_role_${slug}`, role);
};

export const clearAuth = (slug: string) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`avl_token_${slug}`);
  localStorage.removeItem(`avl_role_${slug}`);
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

// --- MODAL DE PIN (Estilo Yoshi) ---
interface PinModalProps {
  slug: string;
  requiredRole: 'admin' | 'writer';
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
      
      if (data.ok) {
        const roleHierarchy = { admin: 3, writer: 2, viewer: 1 };
        const userLevel = roleHierarchy[data.role as keyof typeof roleHierarchy] || 1;
        const requiredLevel = roleHierarchy[requiredRole];

        if (userLevel >= requiredLevel) {
          saveAuth(slug, data.token, data.role);
          onSuccess();
        } else {
          setError('Nível insuficiente. Você precisa comer mais maçãs! 🍎');
        }
      } else {
        setError('PIN incorreto! A bola foi na rede. 🏐❌');
      }
    } catch (err) {
      setError('Erro no servidor! O Yoshi tropeçou. 🥚');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-green-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border-b-8 border-green-500 animate-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-2">
          {/* Ovos e referências ao Yoshi */}
          <div className="text-5xl drop-shadow-md">🥚</div>
          <button onClick={onClose} className="text-gray-400 font-black text-2xl p-2 hover:text-gray-600">✕</button>
        </div>
        <h2 className="text-3xl font-black text-green-700 mb-1 leading-tight">Acesso<br/>Restrito</h2>
        <p className="text-gray-500 mb-6 font-bold text-sm">
          Nível exigido: <span className="uppercase text-orange-500">{requiredRole}</span>
        </p>

        <form onSubmit={handleValidate} className="flex flex-col gap-4">
          <input
            type="number"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="text-center text-4xl font-black p-4 rounded-2xl bg-green-50 border-4 border-green-200 text-green-900 focus:outline-none focus:border-orange-500 transition-colors"
            placeholder="****"
            maxLength={6}
            autoFocus
          />
          
          {error && <div className="text-red-600 font-bold bg-red-100 p-3 rounded-xl text-center text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading || !pin}
            className="bg-orange-500 text-white text-2xl font-black py-4 rounded-2xl border-b-8 border-orange-700 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50 mt-2 flex justify-center items-center gap-2"
          >
            {loading ? 'Pulando... 🦖' : 'LIBERAR 🔥'}
          </button>
        </form>
      </div>
    </div>
  );
}