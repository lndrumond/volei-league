import { MetadataRoute } from 'next';

// Ícones gerados por scripts/gerar-imagens.mjs a partir de public/bola.png.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AVL | Amigos do Vôlei League',
    short_name: 'Amigos do Vôlei',
    description: 'Gerenciador oficial das rodadas de vôlei do nosso grupo.',
    start_url: '/',
    display: 'standalone', // abre como app, sem a barra do navegador
    background_color: '#E8F1F6', // fundo do tema (--bg)
    theme_color: '#1479B8', // azul-mar do tema (--sea), cor da barra do celular
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
