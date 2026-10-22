'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button, Card, EmptyState, GuestTag, Sub, useToast } from '@/components/ui';
import AppHeader from '@/components/AppHeader';

interface TargetPlayer {
  id: string;
  name: string;
  is_guest: boolean;
}

const FIELD = 'w-full bg-surface2 text-ink border-[3px] border-line rounded-[14px] px-3 py-3 min-h-14 text-center text-3xl font-display font-bold tracking-[0.3em]';

// Frases cômicas por faixa de nota (a nota em si é secreta).
const scoreLabel = (score: number) => {
  if (score <= 2) return 'Joga fofo 🧸';
  if (score <= 4) return 'Muitas furadas 🥊';
  if (score <= 6) return 'Tá na média 📊';
  if (score <= 8) return 'Acima da média 🚀';
  if (score === 9) return 'Puxa a responsa ⚡';
  return 'Estrela do Vôlei ⭐';
};

function VoteContent() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialPin = searchParams.get('pin') || '';

  const [pinInput, setPinInput] = useState(initialPin);
  const [activePin, setActivePin] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [voterName, setVoterName] = useState<string>('');
  const [targets, setTargets] = useState<TargetPlayer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Valida o PIN
  const validatePin = async (pinToValidate: string) => {
    if (!pinToValidate.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/vote/validate?slug=${slug}&pin=${encodeURIComponent(pinToValidate.trim())}`);
      const data = await res.json();

      if (data.valid) {
        setActivePin(pinToValidate.trim());
        setVoterName(data.voter.name);
        setTargets(data.targets);

        // Inicializa todas as notas com 5
        const initialScores: Record<string, number> = {};
        (data.targets || []).forEach((t: TargetPlayer) => { initialScores[t.id] = 5; });
        setScores(initialScores);
      } else {
        setErrorMsg(data.message || 'PIN inválido.');
      }
    } catch {
      setErrorMsg('Erro ao conectar à quadra.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPin) validatePin(initialPin);
  }, [initialPin]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScoreChange = (targetId: string, value: number) => {
    setScores((prev) => ({ ...prev, [targetId]: value }));
  };

  const handleSubmitVotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePin) return;

    setSubmitting(true);
    try {
      const formattedVotes = Object.entries(scores).map(([target_id, score]) => ({ target_id, score }));

      const res = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, pin: activePin, votes: formattedVotes }),
      });

      const data = await res.json();
      if (data.ok) setSubmitted(true);
      else toast.error(data.error || 'Erro ao enviar votos.');
    } catch {
      toast.error('Erro de conexão ao salvar votos.');
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode, extraBottom = false) => (
    <div className={`min-h-screen bg-bg text-ink p-4 ${extraBottom ? 'pb-32' : 'pb-10'} max-w-md mx-auto flex flex-col gap-3`}>
      <AppHeader title="Urna" />
      {children}
    </div>
  );

  // --- 1. TELA DE SUCESSO ---
  if (submitted) {
    return shell(
      <EmptyState
        icon="🗳️"
        title="Votos salvos!"
        text={`Obrigado, ${voterName}! Suas avaliações foram guardadas a sete chaves. 🤫`}
        action={<Button variant="sun" onClick={() => router.push(`/g/${slug}`)}>Voltar pro jogo</Button>}
      />,
    );
  }

  // --- 2. TELA DE DIGITAR PIN (sem PIN válido na URL, ou deu erro) ---
  if (!activePin) {
    return shell(
      <Card>
        <div className="text-center">
          <div className="text-5xl" aria-hidden="true">🗳️</div>
          <h1 className="text-2xl font-bold mt-1">Urna Eletrônica</h1>
          <Sub className="mt-1">Digite seu PIN de votação</Sub>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); validatePin(pinInput); }} className="flex flex-col gap-3">
          <label htmlFor="votepin" className="sr-only">PIN de votação</label>
          <input
            id="votepin"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="••••"
            maxLength={6}
            className={FIELD}
          />
          {errorMsg && <p role="alert" className="font-bold text-danger text-center">{errorMsg}</p>}
          <Button type="submit" variant="sun" disabled={loading || !pinInput.trim()}>{loading ? 'Validando...' : 'Entrar na urna'}</Button>
        </form>
        <Button size="sm" onClick={() => router.push(`/g/${slug}`)}>Voltar para a liga</Button>
      </Card>,
    );
  }

  // --- 3. FORMULÁRIO DE VOTAÇÃO ---
  return shell(
    <>
      <Card slim className="text-center">
        <div className="text-4xl" aria-hidden="true">🤫</div>
        <h1 className="text-xl font-bold">Bem-vindo, {voterName}!</h1>
        <Sub>Dê as notas dos parceiros de quadra. As notas são 100% secretas e servem para equilibrar os times.</Sub>
        <p className="text-sm font-bold text-danger">Notas de 1 a 10. Seja justo para equilibrar os times.</p>
      </Card>

      <form onSubmit={handleSubmitVotes} className="flex flex-col gap-3">
        {targets.length === 0 ? (
          <Card slim><Sub className="text-center">Nenhum outro jogador disponível para votar nesta rodada.</Sub></Card>
        ) : (
          targets.map((target) => {
            const current = scores[target.id] || 5;
            return (
              <Card key={target.id} slim>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-xl min-w-0 truncate">
                    {target.name}
                    {target.is_guest && <GuestTag />}
                  </span>
                  <span className="shrink-0 font-extrabold text-sm bg-surface2 border-2 border-soft rounded-full px-3 py-1">{scoreLabel(current)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-muted text-sm">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={current}
                    aria-label={`Nota para ${target.name}`}
                    onChange={(e) => handleScoreChange(target.id, parseInt(e.target.value))}
                    className="w-full h-3 cursor-pointer accent-sea"
                  />
                  <span className="font-extrabold text-muted text-sm">10</span>
                  <span className="bg-sun text-sun-ink border-2 border-line font-display font-bold text-xl px-2.5 py-0.5 rounded-[12px] min-w-11 text-center tabular-nums">{current}</span>
                </div>
              </Card>
            );
          })
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-bg border-t-[3px] border-line z-40">
          <div className="max-w-md mx-auto">
            <Button type="submit" variant="sun" disabled={submitting || targets.length === 0}>{submitting ? 'Enviando votos...' : 'Enviar votos na urna 🗳️'}</Button>
          </div>
        </div>
      </form>
    </>,
    true,
  );
}

export default function VotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg text-ink flex items-center justify-center p-4">
          <h2 className="font-display font-bold text-2xl animate-pulse">Carregando urna... 🗳️</h2>
        </div>
      }
    >
      <VoteContent />
    </Suspense>
  );
}
