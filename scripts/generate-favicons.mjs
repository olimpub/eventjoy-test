import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'favicon.svg'));
const iconsDir = join(root, 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

function renderPng(size) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  })
    .render()
    .asPng();
}

function pngToIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size >= 256 ? 0 : size, 6);
  header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

for (const size of [16, 32, 96, 128]) {
  writeFileSync(join(iconsDir, `favicon-${size}x${size}.png`), renderPng(size));
}

writeFileSync(join(root, 'public', 'favicon.ico'), pngToIco(renderPng(32), 32));
writeFileSync(join(root, 'public', 'apple-touch-icon.png'), renderPng(180));
console.log('Wrote favicon.ico, apple-touch-icon.png, and public/icons/favicon-*.png');
