import type { ReelMotionType } from '../types/portfolio';

export function drawReelFrame(
  canvas: HTMLCanvasElement,
  motionType: ReelMotionType | string,
  client: string,
  title: string,
  t: number
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(240, Math.floor(rect.width || 320));
  const h = Math.max(240, Math.floor(rect.height || 360));

  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }

  ctx.save();
  ctx.scale(dpr, dpr);

  const bg = ctx.createLinearGradient(0, 0, w, h);
  if (motionType === 'giveday-wave') {
    bg.addColorStop(0, '#04262b');
    bg.addColorStop(1, '#0b1120');
  } else if (motionType === 'cosmetics-spotlight') {
    bg.addColorStop(0, '#2e0619');
    bg.addColorStop(1, '#0d0409');
  } else if (motionType === 'fashion-glitch') {
    bg.addColorStop(0, '#140305');
    bg.addColorStop(1, '#050505');
  } else if (motionType === 'ugc-storyboard') {
    bg.addColorStop(0, '#1b0b12');
    bg.addColorStop(1, '#09090b');
  } else if (motionType === 'rayon-pulse') {
    bg.addColorStop(0, '#200306');
    bg.addColorStop(1, '#080808');
  } else {
    bg.addColorStop(0, '#1c1005');
    bg.addColorStop(1, '#0a0705');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  if (motionType === 'giveday-wave') {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const y = h * 0.48 + Math.sin(x * 0.02 + t * 3.2 + i * 1.1) * (24 + i * 8);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(52,211,153,0.65)' : 'rgba(56,189,248,0.45)';
      ctx.lineWidth = 3 - i * 0.4;
      ctx.stroke();
    }
    const r = 34 + ((t * 48) % 85);
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.44, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(52,211,153,${Math.max(0, 1 - r / 120)})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (motionType === 'cosmetics-spotlight') {
    const cx = w * 0.5 + Math.cos(t * 2.2) * 34;
    const cy = h * 0.42 + Math.sin(t * 1.8) * 20;
    const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 130);
    glow.addColorStop(0, 'rgba(251,113,133,0.92)');
    glow.addColorStop(0.5, 'rgba(230,10,21,0.34)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const bob = Math.sin(t * 3) * 8;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.strokeStyle = 'rgba(253,230,138,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(w * 0.5 - 26, h * 0.32 + bob, 52, 84, 14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(w * 0.5 - 12, h * 0.25 + bob, 24, 18);
  } else if (motionType === 'fashion-glitch') {
    const offset = (t * 110) % (w + 140);
    ctx.fillStyle = 'rgba(230,10,21,0.82)';
    ctx.beginPath();
    ctx.moveTo(offset - 80, 0);
    ctx.lineTo(offset - 22, 0);
    ctx.lineTo(offset - 110, h);
    ctx.lineTo(offset - 168, h);
    ctx.closePath();
    ctx.fill();

    const jitter = t > 0 ? Math.sin(t * 28) * 4 : 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(w * 0.22 + jitter, h * 0.26, w * 0.56, h * 0.36);

    ctx.fillStyle = '#E60A15';
    ctx.font = '900 32px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DROP 01', w * 0.5 - jitter * 1.4, h * 0.48);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('DROP 01', w * 0.5 + jitter, h * 0.48);
  } else if (motionType === 'ugc-storyboard') {
    for (let i = 0; i < 3; i++) {
      const shift = ((t * 55 + i * 105) % (w + 90)) - 70;
      const yOff = h * 0.22 + Math.sin(t * 2.5 + i) * 7;
      ctx.fillStyle = i === 1 ? 'rgba(230,10,21,0.28)' : 'rgba(255,255,255,0.08)';
      ctx.strokeStyle = i === 1 ? '#E60A15' : 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(shift, yOff, 86, 128, 16);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#E60A15';
    ctx.beginPath();
    ctx.roundRect(w * 0.12, h * 0.62, w * 0.76, 26, 13);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 10.5px Montserrat, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('“WATCH THIS TRANSFORMATION ✨”', w * 0.5, h * 0.62 + 17);
  } else if (motionType === 'rayon-pulse') {
    const cx = w * 0.5;
    const cy = h * 0.44;
    const pulse = 1 + Math.sin(t * 4.5) * 0.08;

    const rad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 95 * pulse);
    rad.addColorStop(0, 'rgba(230,10,21,0.75)');
    rad.addColorStop(1, 'transparent');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.arc(0, 0, 44, -Math.PI * 0.22, Math.PI * 1.22);
    ctx.strokeStyle = '#ff4d2e';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(16, -6);
    ctx.lineTo(8, 16);
    ctx.lineTo(-8, 16);
    ctx.lineTo(-16, -6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#080808';
    ctx.beginPath();
    ctx.arc(0, -6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    for (let i = 0; i < 14; i++) {
      const px = ((i * 63 + t * (28 + (i % 4) * 12)) % (w + 40)) - 20;
      const py = h * 0.18 + ((i * 47) % (h * 0.58)) + Math.sin(t * 2 + i) * 10;
      const r = 6 + (i % 4) * 5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(253,224,71,0.42)' : 'rgba(230,10,21,0.32)';
      ctx.fill();
    }
  }

  const prog = t === 0 ? 0.16 : (t * 0.28) % 1;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(16, h - 14, w - 32, 3.5);
  ctx.fillStyle = '#E60A15';
  ctx.fillRect(16, h - 14, (w - 32) * prog, 3.5);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '800 13px Syne, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText((client || 'PROJECT').toUpperCase(), 18, h - 44);
  ctx.fillStyle = 'rgba(255,255,255,0.68)';
  ctx.font = '500 11px Inter, sans-serif';
  ctx.fillText((title || '').slice(0, 32), 18, h - 26);

  ctx.restore();
}
