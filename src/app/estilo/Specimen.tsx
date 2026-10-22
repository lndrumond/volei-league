'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Chip, ConfirmModal, EmptyState, Eyebrow, Modal, PlayerChip, Sub, useToast } from '@/components/ui';
import BottomNav from '@/components/BottomNav';

type Theme = 'auto' | 'light' | 'dark';

const SWATCHES: [string, string][] = [
  ['bg', 'bg-bg'], ['surface', 'bg-surface'], ['surface2', 'bg-surface2'], ['ink', 'bg-ink'], ['muted', 'bg-muted'], ['soft', 'bg-soft'],
  ['sea', 'bg-sea'], ['vest', 'bg-vest'], ['sun', 'bg-sun'], ['danger', 'bg-danger'], ['ok', 'bg-ok'],
  ['gold', 'bg-gold'], ['silver', 'bg-silver'], ['bronze', 'bg-bronze'],
];

export default function Specimen() {
  const toast = useToast();
  const [theme, setTheme] = useState<Theme>('auto');
  const [filter, setFilter] = useState('ultimas');
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    return () => root.removeAttribute('data-theme');
  }, [theme]);

  return (
    <div className="min-h-screen bg-bg text-ink p-4 pb-32 max-w-md mx-auto flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Sistema visual AVL</h1>
      <Sub>Vitrine de desenvolvimento. Não aparece em produção.</Sub>

      <Card slim>
        <Eyebrow>Tema</Eyebrow>
        <div className="flex gap-2 flex-wrap">
          {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
            <Chip key={t} pressed={theme === t} onClick={() => setTheme(t)}>{t === 'auto' ? 'Automático' : t === 'light' ? 'Claro' : 'Escuro'}</Chip>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Cores</Eyebrow>
        <div className="grid grid-cols-4 gap-2">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <div className={`${cls} w-full h-11 rounded-[12px] border-2 border-line`} />
              <span className="text-[11px] font-bold">{name}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Eyebrow>Tipografia</Eyebrow>
        <p className="font-display text-4xl font-bold leading-none">6 x 3</p>
        <h2 className="text-2xl font-bold">Título em Fredoka</h2>
        <p>Texto corrido em Nunito, legível no celular, com <b>negrito</b> quando precisa.</p>
        <Sub>Texto de apoio, em tom mais suave.</Sub>
      </Card>

      <Card>
        <Eyebrow>Botões</Eyebrow>
        <Button variant="sun">Iniciar rodada</Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="sea">Sem Colete</Button>
          <Button variant="vest">Com Colete</Button>
        </div>
        <Button variant="danger">Encerrar</Button>
        <Button>Neutro</Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button size="sm">Pequeno</Button>
          <Button size="sm" disabled>Desabilitado</Button>
        </div>
      </Card>

      <Card>
        <Eyebrow>Chips</Eyebrow>
        <div className="flex gap-2 flex-wrap">
          {[['ultimas', 'Últimas 5 rodadas'], ['hoje', 'Hoje'], ['7d', '7 dias'], ['periodo', 'Escolher período']].map(([id, label]) => (
            <Chip key={id} pressed={filter === id} onClick={() => setFilter(id)}>{label}</Chip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PlayerChip name="Andrea" captain />
          <PlayerChip name="Marcelo" guest />
          <PlayerChip name="Ti Lu" onClick={() => toast.show('Tocou em Ti Lu')} ariaLabel="Ti Lu: trocar de time" />
          <PlayerChip name="Tia kk" captain onClick={() => toast.show('Tocou em Tia kk')} ariaLabel="Tia kk: trocar de time" />
        </div>
      </Card>

      <Card>
        <Eyebrow>Medalhas</Eyebrow>
        {[['🥇', 'bg-gold', 'Ti Lu', '40 pts'], ['🥈', 'bg-silver', 'Mauricio', '29 pts'], ['🥉', 'bg-bronze', 'Andrea', '24 pts']].map(([m, bg, n, p]) => (
          <div key={n} className={`${bg} border-2 border-line rounded-[16px] px-3 py-2 flex items-center gap-3`}>
            <span className="text-2xl" aria-hidden="true">{m}</span>
            <span className="font-extrabold flex-1">{n}</span>
            <span className="font-display font-bold">{p}</span>
          </div>
        ))}
      </Card>

      <Card>
        <Eyebrow>Avisos e janelas</Eyebrow>
        <Button size="sm" onClick={() => toast.show('Visitante cadastrado')}>Aviso comum</Button>
        <Button size="sm" onClick={() => toast.error('Não deu pra salvar. Tenta de novo.')}>Aviso de erro</Button>
        <Button size="sm" onClick={() => setModal(true)}>Abrir janela</Button>
        <Button size="sm" onClick={() => setConfirm(true)}>Abrir confirmação</Button>
      </Card>

      <EmptyState icon="😴" title="Nenhuma partida no momento" text="Quando o admin iniciar, o placar ao vivo aparece aqui." action={<Button variant="sun">Iniciar partida</Button>} />

      <Modal open={modal} onClose={() => setModal(false)} title="Ti Lu">
        <p className="text-muted">Está no Sem Colete. O que você quer fazer?</p>
        <Button variant="vest" onClick={() => setModal(false)}>Passar para o Com Colete</Button>
        <Button onClick={() => setModal(false)}>Mandar para o banco de areia</Button>
        <Button size="sm" onClick={() => setModal(false)}>Voltar</Button>
      </Modal>

      <ConfirmModal
        open={confirm}
        danger
        title="Bora pro banho?"
        text="Isso encerra a partida e a rodada, e salva tudo no histórico."
        confirmLabel="Encerrar"
        onConfirm={() => { setConfirm(false); toast.show('Rodada encerrada'); }}
        onClose={() => setConfirm(false)}
      />

      <BottomNav slug="amigos-do-volei" active="ranking" />
    </div>
  );
}
