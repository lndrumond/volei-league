import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AVL | Amigos do Vôlei League ',
    short_name: 'Vôlei Areia',
    description: 'Gerenciador oficial das rodadas de vôlei do nosso grupo.',
    start_url: '/',
    display: 'standalone', // 🚨 ISSO AQUI TIRA A BARRA DO NAVEGADOR!
    background_color: '#f0fdf4', // Fundo verde clarinho
    theme_color: '#22c55e', // Verde principal pro topo do celular
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}