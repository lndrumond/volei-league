'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => { router.replace('/g/amigos-do-volei'); }, [router]);
  return <div className="min-h-screen bg-bg flex items-center justify-center text-4xl" aria-label="Carregando">🏐</div>;
}