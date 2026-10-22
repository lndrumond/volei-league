import type { ReactNode } from 'react';
import Card from './Card';

interface Props {
  icon: string;
  title: string;
  text?: string;
  /** Botão de ação opcional (ex.: "Iniciar partida", só para admin). */
  action?: ReactNode;
}

// Tela vazia com bola, título e uma frase curta.
export default function EmptyState({ icon, title, text, action }: Props) {
  return (
    <Card className="items-center text-center py-8">
      <div className="text-5xl leading-none" aria-hidden="true">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      {text && <p className="text-muted">{text}</p>}
      {action && <div className="w-full mt-1">{action}</div>}
    </Card>
  );
}
