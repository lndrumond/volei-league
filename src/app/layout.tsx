import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AVL | Amigos do Vôlei League",
  description: "Liga de Vôlei ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <footer className="w-full bg-gray-900 text-center py-4 z-50 mt-auto">
          <p className="text-gray-400 font-bold text-xs tracking-widest">
            &copy; {new Date().getFullYear()} Desenvolvido por <span className="text-white">Amigos do Vôlei</span>
          </p>
        </footer>
      </body>
    </html>
  );
}
