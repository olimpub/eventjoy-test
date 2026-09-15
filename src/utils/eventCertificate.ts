import { jsPDF } from 'jspdf';
import ptaLogo from 'src/assets/PTA.png';

export interface EventCertificateInput {
  personName: string;
  eventName: string;
  eventDateLabel: string;
  roleName: string;
  place?: number | null;
  score?: number | null;
}

const PAGE_W_MM = 297;
const PAGE_H_MM = 210;
const PX_W = 1754;
const PX_H = 1240;
const FONT = 'Poppins, "Segoe UI", Roboto, sans-serif';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) {
      let cut = last;
      while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
      lines[maxLines - 1] = `${cut}…`;
    }
  }
  return lines;
}

function fileSafe(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    .toLowerCase();
}

function formatCertificateScore(score: number): string {
  return Math.round(score * 1000).toLocaleString('hu-HU');
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function paintCertificate(input: EventCertificateInput): Promise<HTMLCanvasElement> {
  await document.fonts.ready.catch(() => undefined);
  const canvas = document.createElement('canvas');
  canvas.width = PX_W;
  canvas.height = PX_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Az oklevél nem rajzolható.');

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, PX_W, PX_H);

  const inset = 48;
  roundRect(ctx, inset, inset, PX_W - inset * 2, PX_H - inset * 2, 28);
  ctx.fillStyle = '#111827';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#fbbf24';
  ctx.stroke();

  roundRect(ctx, inset + 18, inset + 18, PX_W - (inset + 18) * 2, PX_H - (inset + 18) * 2, 18);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.stroke();

  const cx = PX_W / 2;
  const logo = await loadImage(typeof ptaLogo === 'string' ? ptaLogo : String(ptaLogo));
  if (logo && logo.naturalWidth > 0) {
    const maxW = 720;
    const maxH = 180;
    const scale = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
    const logoW = logo.naturalWidth * scale;
    const logoH = logo.naturalHeight * scale;
    ctx.drawImage(logo, cx - logoW / 2, 108, logoW, logoH);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText('OKLEVÉL', cx, 328);

  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText('Ezen oklevél tanúsítja, hogy', cx, 400);

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 56px ${FONT}`;
  const nameLines = wrapText(ctx, input.personName, PX_W - 280, 2);
  let y = 490;
  for (const line of nameLines) {
    ctx.fillText(line, cx, y);
    y += 64;
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText('részt vett a(z)', cx, y + 16);

  ctx.fillStyle = '#7dd3fc';
  ctx.font = `800 36px ${FONT}`;
  const eventLines = wrapText(ctx, input.eventName, PX_W - 280, 3);
  y += 80;
  for (const line of eventLines) {
    ctx.fillText(line, cx, y);
    y += 46;
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText('eseményen.', cx, y + 8);

  y += 100;
  const place = input.place != null && input.place >= 1 && input.place <= 8 ? input.place : null;
  const score = input.score != null && Number.isFinite(input.score) ? input.score : null;
  if (place != null) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = `800 52px ${FONT}`;
    ctx.fillText(`${place}. helyezés`, cx, y);
    y += 70;
  }
  if (score != null) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText('Pontszám', cx, y);
    ctx.fillStyle = '#7dd3fc';
    ctx.font = `800 48px ${FONT}`;
    ctx.fillText(`${formatCertificateScore(score)}`, cx, y + 56);
  }

  const meta = [input.eventDateLabel, input.roleName].filter(Boolean).join('  ·  ');
  ctx.fillStyle = '#fbbf24';
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText(meta, cx, PX_H - 110);

  return canvas;
}

export async function downloadEventCertificatePdf(input: EventCertificateInput): Promise<void> {
  const personName = input.personName.trim() || 'Résztvevő';
  const eventName = input.eventName.trim() || 'Esemény';
  const canvas = await paintCertificate({
    ...input,
    personName,
    eventName,
  });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, PAGE_W_MM, PAGE_H_MM);
  const slug = fileSafe(personName) || 'oklevel';
  pdf.save(`oklevel-${slug}.pdf`);
}
