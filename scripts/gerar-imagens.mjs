// Gera as imagens leves usadas pelo app a partir dos originais em public/ (logo.png e bola.png).
// Rodar de novo sempre que trocar a logo ou a bola:  node scripts/gerar-imagens.mjs
// Usa o sharp, que já vem com o Next.
import sharp from 'sharp';

const jobs = [
  // Logo do cabeçalho: aparece com 44 px de altura; 3x para telas de alta densidade.
  { src: 'public/logo.png', out: 'public/logo-header.png', resize: { height: 132 } },
  // Ícones do app (aba do navegador, tela inicial do celular e app instalado).
  { src: 'public/bola.png', out: 'public/icon-32.png', resize: { width: 32, height: 32 } },
  { src: 'public/bola.png', out: 'public/apple-icon.png', resize: { width: 180, height: 180 } },
  { src: 'public/bola.png', out: 'public/icon-192.png', resize: { width: 192, height: 192 } },
  { src: 'public/bola.png', out: 'public/icon-512.png', resize: { width: 512, height: 512 } },
];

for (const { src, out, resize } of jobs) {
  const info = await sharp(src)
    .resize({ ...resize, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(out);
  console.log(`${out}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
}
