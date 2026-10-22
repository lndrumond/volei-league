'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'info' | 'error';
interface ToastItem { id: number; text: string; kind: ToastKind }

interface ToastApi {
  /** Aviso rápido que some sozinho. Substitui o `alert()`. */
  show: (text: string, kind?: ToastKind) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return ctx;
}

const DURATION: Record<ToastKind, number> = { info: 2800, error: 5000 };

// Fica acima da barra inferior. Erros usam role="alert" (lido na hora por leitores de tela).
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const show = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-2), { id, text, kind }]);
    timers.current.set(id, setTimeout(() => dismiss(id), DURATION[kind]));
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({ show, error: (text) => show(text, 'error') }), [show]);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach((t) => clearTimeout(t)); map.clear(); };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed left-0 right-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={[
              'pointer-events-auto max-w-md w-full text-center font-bold rounded-[14px] border-[3px] border-line shadow-pop px-4 py-3',
              t.kind === 'error' ? 'bg-danger text-danger-ink' : 'bg-ink text-bg',
            ].join(' ')}
            onClick={() => dismiss(t.id)}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
