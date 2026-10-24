'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@/components/ui';

// Versão das novidades. Suba este número a cada atualização grande: quem já viu a versão atual não vê o popup de novo.
export const NOVIDADES_VERSAO = '2.1';
const CHAVE = 'avl-novidades-vista';
// Evento para reabrir o popup de qualquer tela (botão "Ver novidades" do Dashboard).
export const NOVIDADES_ABRIR = 'avl-novidades-abrir';

// O armazenamento pode falhar (modo privado, dados bloqueados). Nesse caso o popup simplesmente não é marcado como visto.
function lerVista(): string | null {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}

function marcarVista() {
  try { localStorage.setItem(CHAVE, NOVIDADES_VERSAO); } catch { /* sem armazenamento: nada a fazer */ }
}

const ITENS = [
  { icone: '🏆', titulo: 'Mural dos Campeões', texto: 'o campeão de cada mês, do mais recente ao mais antigo.' },
  { icone: '⚖️', titulo: 'Sorteio mais equilibrado', texto: 'os times são montados com base na avaliação do grupo.' },
  { icone: '📅', titulo: 'Campeão do mês no início', texto: 'a honraria aparece na tela inicial.' },
  { icone: '🎨', titulo: 'Visual novo', texto: 'cores, botões e placar redesenhados.' },
];

// Adendo da versão atual: novidades que chegaram depois da 2.0.
const ADENDO = [
  { icone: '👑', titulo: 'Lenda da Areia', texto: 'quem mais ganhou sets na história do grupo, com atalho para o ranking.' },
  { icone: '🏐', titulo: 'Ranking de Fominha', texto: 'quem mais jogou partidas (cada vez que foi escalado num time). Tem aba própria e o card Maior Fominha no início.' },
];

// Aparece uma vez por versão, na primeira vez que a pessoa abre o app depois da atualização.
export default function Novidades() {
  const [aberto, setAberto] = useState(false);

  // Só depois de montar: o servidor não sabe o que está no armazenamento do aparelho (evita erro de hidratação).
  useEffect(() => {
    if (lerVista() === NOVIDADES_VERSAO) return;
    marcarVista();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura do armazenamento do aparelho, só ao montar
    setAberto(true);
  }, []);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(NOVIDADES_ABRIR, abrir);
    return () => window.removeEventListener(NOVIDADES_ABRIR, abrir);
  }, []);

  return (
    <Modal open={aberto} onClose={() => setAberto(false)} title={`Novidades · versão ${NOVIDADES_VERSAO}`}>
      <p className="text-muted">Mudou muita coisa. Olha o que tem de novo:</p>

      <p className="text-sm text-muted">
        <strong className="text-ink">Notas do desenvolvedor:</strong> a fim de melhorar a experiência, fizemos algumas mudanças e adicionamos as novidades abaixo.
      </p>

      <ul className="flex flex-col gap-2.5">
        {ITENS.map((item) => (
          <li key={item.titulo} className="flex gap-3 items-start">
            <span aria-hidden="true" className="text-2xl leading-none">{item.icone}</span>
            <span>
              <strong className="font-display text-lg">{item.titulo}:</strong> {item.texto}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2.5">
        <p className="font-display font-bold text-lg">Adendo:</p>
        <ul className="flex flex-col gap-2.5">
          {ADENDO.map((item) => (
            <li key={item.titulo} className="flex gap-3 items-start">
              <span aria-hidden="true" className="text-2xl leading-none">{item.icone}</span>
              <span>
                <strong className="font-display text-lg">{item.titulo}:</strong> {item.texto}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button variant="sun" onClick={() => setAberto(false)}>Bora jogar!</Button>

      <p className="text-center text-sm italic text-muted">
        Desenvolvido por{' '}
        <a href="https://github.com/lndrumond" target="_blank" rel="noopener noreferrer" className="font-bold not-italic text-sea underline">
          Leo
        </a>{' '}
        · Amigos do Vôlei
      </p>
    </Modal>
  );
}
