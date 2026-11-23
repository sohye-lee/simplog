// Regenerates every static logo asset from src/lib/coin.ts.
// Run: node scripts/gen-logo.ts && npx capacitor-assets generate ... (see below)
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { coinSvg } from '../src/lib/coin.ts';

const INK = '#18181B';
const png = (svg: string, size: number, out: string) =>
  sharp(Buffer.from(svg), { density: Math.ceil((72 * size) / 64) }).resize(size, size).png().toFile(out);

// Web: transparent favicon, opaque home-screen icons on ink
writeFileSync('public/favicon.svg', coinSvg() + '\n');
await png(coinSvg({ background: INK, scale: 0.72 }), 180, 'public/apple-touch-icon.png');
await png(coinSvg({ background: INK, scale: 0.72 }), 192, 'public/icon-192.png');
await png(coinSvg({ background: INK, scale: 0.66 }), 512, 'public/icon-512.png');

// Native sources for @capacitor/assets (npx capacitor-assets generate)
await png(coinSvg({ background: INK, scale: 0.72 }), 1024, 'assets/icon-only.png');      // iOS + legacy Android
await png(coinSvg({ scale: 0.62 }), 1024, 'assets/icon-foreground.png');                // Android adaptive (safe zone)
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: INK } }).png().toFile('assets/icon-background.png');
const splash = (bg: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="${bg}"/><svg x="1116" y="1116" width="500" height="500" viewBox="0 0 64 64">${coinSvg().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></svg>`;
await sharp(Buffer.from(splash('#F7F7F8'))).png().toFile('assets/splash.png');
await sharp(Buffer.from(splash('#0E0E10'))).png().toFile('assets/splash-dark.png');
console.log('done');
