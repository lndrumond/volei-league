'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface TargetPlayer {
  id: string;
  name: string;
  is_guest: boolean;
}

function VoteContent() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  const searchParams = useSearchParams();

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
        (data.targets || []).forEach((t: TargetPlayer) => {
          initialScores[t.id] = 5;
        });
        setScores(initialScores);
      } else {
        setErrorMsg(data.message || 'PIN inválido.');
      }
    } catch (err) {
      setErrorMsg('Erro ao conectar à quadra.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPin) {
      validatePin(initialPin);
    }
  }, [initialPin]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScoreChange = (targetId: string, value: number) => {
    setScores((prev) => ({ ...prev, [targetId]: value }));
  };

  const handleSubmitVotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePin) return;

    setSubmitting(true);
    try {
      const formattedVotes = Object.entries(scores).map(([target_id, score]) => ({
        target_id,
        score,
      }));

      const res = await fetch('/api/vote/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          pin: activePin,
          votes: formattedVotes,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSubmitted(true);
      } else {
        alert(data.error || 'Erro ao enviar votos.');
      }
    } catch (err) {
      alert('Erro de conexão ao salvar votos.');
    } finally {
      setSubmitting(false);
    }
  };

const getScoreLabel = (score: number) => {
    // <= 2: Vermelho (Alerta leve / Iniciante)
    if (score <= 2) return { text: 'Joga fofo 🧸', color: 'text-red-700 bg-red-100' };
    
    // <= 4: Laranja/Amber (Evoluindo)
    if (score <= 4) return { text: 'Muitas furadas 🥊', color: 'text-orange-700 bg-orange-100' };
    
    // <= 6: Verde (Equilibrado / Seguro)
    if (score <= 6) return { text: 'Tá na média 📊', color: 'text-green-700 bg-green-100' };
    
    // <= 8: Indigo (Habilidade avançada e firme)
    if (score <= 8) return { text: 'Acima da média 🚀', color: 'text-indigo-700 bg-indigo-100' };
    
    // == 9: Rosa/Fúcsia (Destaque total, energia pura)
    if (score == 9) return { text: 'Puxa a responsa ⚡', color: 'text-pink-700 bg-pink-100' };
    
    // Nível 10: Dourado/Amarelo Âmbar de Elite
    return { text: 'Estrela do Vôlei ⭐', color: 'text-amber-700 bg-amber-200' };
  };

  // --- 1. TELA DE SUCESSO ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-green-500 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white text-gray-900 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border-b-8 border-green-700 animate-in zoom-in duration-300">
          <div className="text-7xl mb-4 animate-bounce">🗳️✅</div>
          <h1 className="text-3xl font-black text-green-700 mb-2 leading-tight">Votos Salvos!</h1>
          <p className="text-gray-600 font-bold mb-6">
            Obrigado, <span className="text-green-800">{voterName}</span>! Suas avaliações foram guardadas a sete chaves no cofre do Yoshi. 🤫
          </p>
          <button
            onClick={() => router.push(`/g/${slug}`)}
            className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl text-xl border-b-4 border-orange-700 active:translate-y-1 transition-all shadow-md"
          >
            VOLTAR PRO JOGO 🏐
          </button>
        </div>
      </div>
    );
  }

  // --- 2. TELA DE DIGITAR PIN (Caso não tenha PIN válido na URL ou deu erro) ---
  if (!activePin) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border-b-8 border-green-500 text-center font-sans">
          <div className="text-6xl mb-3">🗳️</div>
          <h1 className="text-3xl font-black text-green-900 mb-1 leading-tight">Urna Eletrônica</h1>
          <p className="text-gray-500 font-bold text-sm mb-6">Digite seu PIN de votação de 4 dígitos</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              validatePin(pinInput);
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="text"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="****"
              maxLength={6}
              className="text-center text-4xl font-black p-4 rounded-2xl bg-green-50 border-4 border-green-200 text-green-900 focus:outline-none focus:border-orange-500 transition-colors tracking-widest"
              autoFocus
            />

            {errorMsg && (
              <div className="bg-red-100 text-red-700 font-bold p-3 rounded-xl text-sm border-2 border-red-200">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pinInput.trim()}
              className="bg-orange-500 text-white text-2xl font-black py-4 rounded-2xl border-b-8 border-orange-700 active:border-b-0 active:translate-y-2 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'VALIDANDO...' : 'ENTRAR NA URNA 🔥'}
            </button>
          </form>

          <button
            onClick={() => router.push(`/g/${slug}`)}
            className="mt-6 text-gray-400 font-bold text-xs hover:text-gray-600 transition-colors"
          >
            ◀ Voltar para a Liga
          </button>
        </div>
      </div>
    );
  }

  // --- 3. FORMULÁRIO DE VOTAÇÃO ---
  return (
    <div className="min-h-screen bg-green-50 p-4 pb-32 max-w-md mx-auto font-sans relative">
      {/* Header */}
      <div className="bg-white p-5 rounded-[2rem] shadow-md border-b-8 border-green-200 mb-6 text-center">
        <div className="text-5xl mb-2">🤫</div>
        <h1 className="text-2xl font-black text-green-900 leading-tight">
          Bem-vindo, <span className="text-orange-500">{voterName}</span>!
        </h1>
        <p className="text-xs text-gray-500 font-bold mt-1">
          Dê as notas dos parceiros de quadra. As notas são 100% secretas e servem para equilibrar os times! 
        </p>
        <p className="text-xs text-red-500 font-bold mt-1">
          Notas de 1 a 10. Seja justo para equilibrar os times. 
        </p>
      </div>

      {/* Lista de Alvos */}
      <form onSubmit={handleSubmitVotes} className="flex flex-col gap-4">
        {targets.length === 0 ? (
          <div className="bg-white p-6 rounded-[2rem] text-center text-gray-500 font-bold">
            Nenhum outro jogador disponível para votar nesta rodada.
          </div>
        ) : (
          targets.map((target) => {
            const currentScore = scores[target.id] || 5;
            const labelInfo = getScoreLabel(currentScore);

            return (
              <div
                key={target.id}
                className="bg-white p-5 rounded-[2rem] shadow-sm border-b-4 border-gray-200 flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xl text-gray-900">{target.name}</span>
                    {target.is_guest && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-full">
                        Visitante
                      </span>
                    )}
                  </div>
                  <div className={`font-black text-sm px-3 py-1 rounded-xl ${labelInfo.color}`}>
                    {labelInfo.text}
                  </div>
                </div>

                {/* Slider de 1 a 10 */}
                <div className="flex items-center gap-4 pt-1">
                  <span className="font-black text-gray-400 text-sm">1</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={currentScore}
                    onChange={(e) => handleScoreChange(target.id, parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <span className="font-black text-gray-400 text-sm">10</span>
                  <span className="bg-orange-500 text-white font-black text-xl px-3 py-1 rounded-xl min-w-[2.5rem] text-center shadow-sm">
                    {currentScore}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Botão Fixo no Rodapé */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-green-50 via-green-50/90 to-transparent z-40 max-w-md mx-auto">
          <button
            type="submit"
            disabled={submitting || targets.length === 0}
            className="w-full bg-orange-500 text-white text-2xl font-black py-5 rounded-[2rem] border-b-8 border-orange-700 active:border-b-0 active:translate-y-2 transition-all shadow-lg disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {submitting ? 'ENVIANDO VOTOS...' : 'ENVIAR VOTOS NA URNA 🗳️'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function VotePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
          <h2 className="text-green-800 font-black text-2xl animate-pulse">Carregando Urna... 🗳️</h2>
        </div>
      }
    >
      <VoteContent />
    </Suspense>
  );
}

