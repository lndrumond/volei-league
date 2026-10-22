'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// A escolha dos presentes agora é o primeiro passo da prancheta (/setup).
export default function AdminRedirect() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();
  useEffect(() => { router.replace(`/g/${slug}/setup`); }, [slug, router]);
  return null;
}
