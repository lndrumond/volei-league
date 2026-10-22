import { notFound } from 'next/navigation';
import Specimen from './Specimen';

// Vitrine dos componentes do sistema visual. Só existe em desenvolvimento: em produção responde 404.
export default function EstiloPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <Specimen />;
}
