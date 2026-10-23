import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { Analytics } from '@vercel/analytics/next';

// Títulos em Fredoka (arredondada, esportiva) e texto em Nunito (legível em tela pequena).
// Os arquivos ficam em src/app/fonts (fontes variáveis, subconjunto latino): não dependem do Google em tempo de execução.
const fredoka = localFont({ src: './fonts/fredoka-latin.woff2', weight: '500 700', variable: '--font-fredoka', display: 'swap' });
const nunito = localFont({ src: './fonts/nunito-latin.woff2', weight: '500 800', variable: '--font-nunito', display: 'swap' });

export const metadata: Metadata = {
  // Cada tela usa o modelo: "Ranking · Amigos do Vôlei" (ver os layout.tsx de cada rota).
  title: { default: 'AVL | Amigos do Vôlei League', template: '%s · Amigos do Vôlei' },
  description: 'Gerenciador oficial das rodadas de vôlei de areia.',
  // Ícones leves gerados por scripts/gerar-imagens.mjs a partir de public/bola.png.
  icons: {
    icon: [{ url: '/icon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/apple-icon.png',
  },
};

// Cor da barra do celular: azul-mar no claro, fundo do tema no escuro.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1479B8' },
    { media: '(prefers-color-scheme: dark)', color: '#08172A' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="flex flex-col min-h-screen bg-bg text-ink font-body">
        
        <ToastProvider>
          <main className="flex-1">
            {children}
          </main>
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}