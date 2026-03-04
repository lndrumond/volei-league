import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="pt-BR">
      <body className="flex flex-col min-h-screen bg-gray-100">
        
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