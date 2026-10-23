import type { Metadata } from 'next';

// Nome da tela na aba do navegador (as páginas são de cliente e não podem exportar metadata).
export const metadata: Metadata = { title: 'Super Admin' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
