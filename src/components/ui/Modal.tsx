'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import Button from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

// Janela que sobe da parte de baixo (fácil de alcançar com o polegar). Fecha com Esc ou tocando fora.
// Leva o foco para dentro, não deixa o Tab sair dela e devolve o foco ao fechar.
export default function Modal({ open, onClose, title, children }: ModalProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) { e.preventDefault(); return; }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/55 flex items-end justify-center" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface text-ink border-[3px] border-line border-b-0 rounded-t-card p-5 pb-6 flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <h3 id={titleId} className="text-2xl font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  /** Ação destrutiva (encerrar, abortar): botão vermelho. */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Pergunta de confirmação com "Voltar" sempre à mão.
export function ConfirmModal({ open, title, text, confirmLabel, danger = false, busy = false, onConfirm, onClose }: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-muted">{text}</p>
      <Button variant={danger ? 'danger' : 'sun'} onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
      <Button size="sm" onClick={onClose}>Voltar</Button>
    </Modal>
  );
}
