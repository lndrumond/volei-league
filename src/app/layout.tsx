import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Títulos em Fredoka (arredondada, esportiva) e texto em Nunito (legível em tela pequena).
// Os arquivos ficam em src/app/fonts (fontes variáveis, subconjunto latino): não dependem do Google em tempo de execução.
const fredoka = localFont({ src: './fonts/fredoka-latin.woff2', weight: '500 700', variable: '--font-fredoka', display: 'swap' });
const nunito = localFont({ src: './fonts/nunito-latin.woff2', weight: '500 800', variable: '--font-nunito', display: 'swap' });

export const metadata: Metadata = {
  title: 'AVL | Amigos do Vôlei League',
  description: 'Gerenciador oficial das rodadas de vôlei de areia.',
  icons: {
    icon: '/bola.png', // 🚨 AQUI ESTÁ A MÁGICA DO FAVICON!
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="flex flex-col min-h-screen bg-bg text-ink font-body">
        
        <main className="flex-1">
          {children}
        </main>

        <footer className="w-full bg-gray-900 text-center py-4 z-50 mt-auto">
          <p className="text-gray-400 font-bold text-xs tracking-widest">
            &copy; {new Date().getFullYear()} Desenvolvido por <span className="text-white">Amigos do Vôlei</span>
          </p>
        </footer>

      </body>
    </html>
  );
}