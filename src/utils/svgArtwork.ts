import type { ToolItem } from '../types/portfolio';

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatRichText(raw: string): string {
  let safe = escapeHtml(raw);
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  safe = safe.replace(
    /(mygiveday\.com)/gi,
    '<a href="https://mygiveday.com" target="_blank" rel="noopener noreferrer" class="font-bold underline hover:text-obsidian transition-colors">$1</a>'
  );
  return safe.replace(/\n/g, '<br />');
}

export async function copySafely(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function openExternalUrl(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  if (url.trim().toLowerCase().startsWith('mailto:')) {
    a.target = '_top';
  } else {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function buildRayOnLogoSVG(monochrome = false, uidSuffix = '0'): string {
  const gradId = `rayCrim-${uidSuffix}`;
  const strokeFill = monochrome ? '#FFFFFF' : `url(#${gradId})`;
  return `
    <svg viewBox="0 0 120 120" class="w-full h-full object-contain" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#C8083B"/>
          <stop offset="50%" stop-color="#E60A15"/>
          <stop offset="100%" stop-color="#FF6B1A"/>
        </linearGradient>
      </defs>
      <path d="M38 34 A30 30 0 1 0 82 34" stroke="${strokeFill}" stroke-width="8.5" stroke-linecap="round" fill="none"/>
      <path d="M60 15 L73 45 L66 64 H54 L47 45 Z" fill="${strokeFill}"/>
      <line x1="60" y1="15" x2="60" y2="43" stroke="#080808" stroke-width="2.5"/>
      <circle cx="60" cy="45" r="3.6" fill="#080808"/>
      <rect x="52" y="67" width="16" height="6.5" rx="1.5" fill="${strokeFill}"/>
      <text x="60" y="102" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="14" font-weight="900" letter-spacing="2">RAY-ON</text>
      <text x="60" y="114" text-anchor="middle" fill="#FFFFFF" fill-opacity="0.72" font-family="Montserrat, sans-serif" font-size="6.2" font-weight="600" letter-spacing="2.2">BRAND AGENCY</text>
    </svg>
  `;
}

export function buildStudioPortraitSVG(variant = 'hero'): string {
  return `
    <svg viewBox="0 0 360 420" class="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="spot-${variant}" cx="50%" cy="44%" r="48%">
          <stop offset="0%" stop-color="#b90a18" stop-opacity="0.9"/>
          <stop offset="68%" stop-color="#4e040a" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#080808" stop-opacity="1"/>
        </radialGradient>
        <linearGradient id="skin-${variant}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#9e6243"/>
          <stop offset="55%" stop-color="#6d3e26"/>
          <stop offset="100%" stop-color="#3e2013"/>
        </linearGradient>
      </defs>
      <rect width="360" height="420" fill="#080808"/>
      <rect width="360" height="420" fill="url(#spot-${variant})"/>
      <path d="M44 420 C58 318 112 288 180 288 C248 288 302 318 316 420 Z" fill="#121212"/>
      <path d="M138 292 L180 352 L222 292" fill="#1c1c1c"/>
      <rect x="156" y="232" width="48" height="48" rx="18" fill="url(#skin-${variant})"/>
      <ellipse cx="180" cy="172" rx="64" ry="78" fill="url(#skin-${variant})"/>
      <path d="M118 158 C116 102 142 78 180 78 C218 78 244 102 242 158 C236 128 214 114 180 114 C146 114 124 128 118 158 Z" fill="#111111"/>
      <path d="M124 190 C128 228 150 248 180 248 C210 248 232 228 236 190 C224 210 206 218 180 218 C154 218 136 210 124 190 Z" fill="#16100e" opacity="0.9"/>
      <circle cx="154" cy="166" r="5" fill="#111"/>
      <circle cx="206" cy="166" r="5" fill="#111"/>
      <path d="M164 205 Q180 212 196 205" stroke="#3c1f14" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>
  `;
}

export function buildQRCodeFallbackSVG(): string {
  const cells = [
    '11111110101101111111', '10000010010101000001', '10111010110001011101', '10111010011001011101',
    '10111010100101011101', '10000010011101000001', '11111110101011111111', '00000000110100000000',
    '10110111001011010110', '01001001110100101001', '11011100101110110110', '00100111010001001101',
    '10111010111010111010', '00000000100110010101', '11111110111001101011', '10000010010110010100',
    '10111010101011101110', '10111010011100110011', '10000010100011001101', '11111110110101101011',
  ];
  let rects = '';
  cells.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '1') {
        rects += `<rect x="${x * 5}" y="${y * 5}" width="4.6" height="4.6" rx="0.8" fill="#0B0B0B"/>`;
      }
    }
  });
  return `
    <svg viewBox="0 0 100 100" class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FFFFFF"/>
      ${rects}
      <rect x="41" y="41" width="18" height="18" rx="4" fill="#E60A15"/>
      <path d="M50 45 L53 51 L50 55 L47 51 Z" fill="#FFFFFF"/>
    </svg>
  `;
}

export function buildToolVectorIcon(tool: ToolItem): string {
  const icons: Record<string, string> = {
    ps: `<span class="font-montserrat font-black text-lg sm:text-xl tracking-tight" style="color:${escapeHtml(tool.color)}">Ps</span>`,
    canva: `<span class="font-caveat font-bold text-xl sm:text-2xl leading-none" style="color:${escapeHtml(tool.color)}">Canva</span>`,
    affinity: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none"><path d="M16 4 L28 26 H4 Z" stroke="${escapeHtml(tool.color)}" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 11 L22 23 H10 Z" fill="${escapeHtml(tool.color)}"/></svg>`,
    figma: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none"><path d="M8.5 2H12v6H8.5a3 3 0 0 1 0-6Z" fill="#F24E1E"/><path d="M12 2h3.5a3 3 0 0 1 0 6H12V2Z" fill="#FF7262"/><path d="M12 8h3.5a3 3 0 1 1 0 6H12V8Z" fill="#1ABCFE"/><path d="M8.5 8H12v6H8.5a3 3 0 0 1 0-6Z" fill="#A259FF"/><path d="M8.5 14H12v3a3 3 0 1 1-3.5-3Z" fill="#0ACF83"/></svg>`,
    capcut: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10 L26 22"/><path d="M26 10 L6 22"/><rect x="5" y="8" width="14" height="16" rx="3" stroke-opacity="0.45"/></svg>`,
    inshot: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none"><rect x="6" y="6" width="20" height="20" rx="6" stroke="#FFFFFF" stroke-width="2.4"/><circle cx="16" cy="16" r="4.5" stroke="#FFFFFF" stroke-width="2.4"/><circle cx="22" cy="10" r="1.4" fill="#FFFFFF"/></svg>`,
    gemini: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none"><path d="M16 3 C16.8 11.5 20.5 15.2 29 16 C20.5 16.8 16.8 20.5 16 29 C15.2 20.5 11.5 16.8 3 16 C11.5 15.2 15.2 11.5 16 3 Z" fill="url(#gemG)"/><defs><linearGradient id="gemG" x1="3" y1="3" x2="29" y2="29"><stop stop-color="#60A5FA"/><stop offset="0.5" stop-color="#A78BFA"/><stop offset="1" stop-color="#F472B6"/></linearGradient></defs></svg>`,
    claude: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none" stroke="${escapeHtml(tool.color)}" stroke-width="2.4" stroke-linecap="round"><line x1="16" y1="4" x2="16" y2="28"/><line x1="4" y1="16" x2="28" y2="16"/><line x1="7.5" y1="7.5" x2="24.5" y2="24.5"/><line x1="24.5" y1="7.5" x2="7.5" y2="24.5"/></svg>`,
    chatgpt: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none" stroke="${escapeHtml(tool.color)}" stroke-width="2.1"><circle cx="16" cy="10.5" r="5"/><circle cx="21" cy="14" r="5"/><circle cx="19" cy="20" r="5"/><circle cx="13" cy="20" r="5"/><circle cx="11" cy="14" r="5"/></svg>`,
    flow: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none"><path d="M5 20 C10 10 14 22 20 12 C23 7 26 11 28 11" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/><circle cx="26.5" cy="11" r="2.5" fill="#FFFFFF"/><path d="M7 24 H23" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="2" stroke-linecap="round"/></svg>`,
    seedance: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none"><path d="M16 5 C22 5 26 9 24 15 C22 20 12 18 10 23 C8.5 26.5 14 28 20 26" stroke="#F472B6" stroke-width="3" stroke-linecap="round"/><circle cx="16" cy="16" r="3" fill="#FFFFFF"/></svg>`,
    kling: `<svg class="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 32 32" fill="none"><path d="M9 7 V25 M9 16 L22 7 M14 13 L23 25" stroke="${escapeHtml(tool.color)}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };
  return (
    icons[tool.id] ||
    `<span class="font-montserrat font-extrabold text-sm" style="color:${escapeHtml(tool.color)}">${escapeHtml(tool.badge || tool.name.slice(0, 2))}</span>`
  );
}

export function buildProjectArtworkSVG(artKey: string, client: string): string {
  const palettes: Record<
    string,
    { bg1: string; bg2: string; accent: string; badge: string; headline: string; sub: string; motif: string }
  > = {
    'giveday-launch': { bg1: '#042f2e', bg2: '#0284c7', accent: '#34d399', badge: 'PRODUCT + CONTENT', headline: 'GIVEDAY', sub: 'MYGIVEDAY.COM', motif: 'rings' },
    'dunni-identity': { bg1: '#1a0c0e', bg2: '#5c1824', accent: '#f5d0a9', badge: 'FASHION', headline: 'DUNNI', sub: 'WEARS & COUTURE', motif: 'arch' },
    'bolex-luxury': { bg1: '#09090b', bg2: '#27272a', accent: '#facc15', badge: 'LUXURY', headline: 'BOLEX', sub: 'COLLECTION', motif: 'diamond' },
    'spark-identity': { bg1: '#23071c', bg2: '#701a75', accent: '#fde047', badge: 'EVENTS', headline: 'SPARK', sub: 'BY DEBBIE', motif: 'star' },
    'marbik-system': { bg1: '#3b0d1f', bg2: '#9d174d', accent: '#fbcfe8', badge: 'COSMETICS', headline: 'MARBIK', sub: 'SIGNATURE GLOW', motif: 'orb' },
    'rayon-guide': { bg1: '#090909', bg2: '#b91c1c', accent: '#ff7b29', badge: 'AGENCY', headline: 'RAY-ON', sub: 'BRAND AGENCY', motif: 'rayon' },
    'giveday-social': { bg1: '#082f49', bg2: '#1d4ed8', accent: '#38bdf8', badge: 'GROWTH ADS', headline: '100% FUNDED', sub: 'GIVEDAY AFRICA', motif: 'bars' },
    'dunni-lookbook': { bg1: '#18181b', bg2: '#7f1d1d', accent: '#ffffff', badge: 'LOOKBOOK', headline: 'SS26 EDIT', sub: 'DUNNI WEARS', motif: 'stripes' },
    'marbik-launch': { bg1: '#2e1065', bg2: '#be185d', accent: '#fde68a', badge: 'BEAUTY DROP', headline: 'RADIANCE', sub: 'MARBIK SIGNATURE', motif: 'orb' },
    'flyer-giveday': { bg1: '#064e3b', bg2: '#0284c7', accent: '#a7f3d0', badge: 'CAMPAIGN', headline: 'FUND YOUR', sub: 'DREAM • GIVEDAY', motif: 'rings' },
    'flyer-spark-gala': { bg1: '#1c1008', bg2: '#78350f', accent: '#fde047', badge: 'VIP GALA', headline: 'ROYAL NIGHT', sub: 'SPARK BY DEBBIE', motif: 'star' },
    'flyer-bolex-drop': { bg1: '#09090b', bg2: '#991b1b', accent: '#ffffff', badge: '50% OFF', headline: 'BLACK DROP', sub: 'BOLEX COLLECTION', motif: 'diamond' },
    'flyer-dunni-popup': { bg1: '#2b0610', bg2: '#881337', accent: '#fda4af', badge: 'RUNWAY', headline: 'POP-UP LIVE', sub: 'DUNNI WEARS', motif: 'arch' },
    'flyer-marbik-class': { bg1: '#4a044e', bg2: '#db2777', accent: '#fef08a', badge: 'MASTERCLASS', headline: 'GLOW LIVE', sub: 'MARBIK SIGNATURE', motif: 'orb' },
    'flyer-rayon-workshop': { bg1: '#0b0b0d', bg2: '#dc2626', accent: '#ff7b29', badge: 'WORKSHOP', headline: 'SWITCH ON', sub: 'RAY-ON AGENCY', motif: 'rayon' },
    'flyer-spark-wedding': { bg1: '#1e1b4b', bg2: '#6d28d9', accent: '#f9a8d4', badge: 'SHOWCASE', headline: 'FOREVER', sub: 'SPARK BY DEBBIE', motif: 'star' },
    'flyer-bolex-watch': { bg1: '#111827', bg2: '#374151', accent: '#fbbf24', badge: 'EDITION 01', headline: 'TIMELESS', sub: 'BOLEX COLLECTION', motif: 'diamond' },
    'flyer-giveday-impact': { bg1: '#042f2e', bg2: '#0f766e', accent: '#5eead4', badge: 'MILESTONE', headline: '10K+ GIVERS', sub: 'GIVEDAY IMPACT', motif: 'bars' },
    'photo-crimson': { bg1: '#0b0b0b', bg2: '#7f1d1d', accent: '#ef4444', badge: 'LOW-KEY', headline: 'STUDIO 01', sub: 'CRIMSON RIM', motif: 'orb' },
    'photo-cultural': { bg1: '#111111', bg2: '#3b0764', accent: '#d8b4fe', badge: 'RETOUCH', headline: 'CUTOUT', sub: 'EDITORIAL MASK', motif: 'arch' },
    'photo-fashion': { bg1: '#18181b', bg2: '#3f3f46', accent: '#f4f4f5', badge: 'LOOKBOOK', headline: 'TAILORED', sub: 'DUNNI WEARS', motif: 'stripes' },
    'photo-beauty': { bg1: '#3b0764', bg2: '#be185d', accent: '#fbcfe8', badge: 'MACRO', headline: 'SERUM GLOW', sub: 'MARBIK STUDIO', motif: 'orb' },
    'photo-watch': { bg1: '#09090b', bg2: '#1f2937', accent: '#fbbf24', badge: 'DARK-FIELD', headline: 'CHRONO', sub: 'BOLEX LUXURY', motif: 'diamond' },
    'photo-event': { bg1: '#1c1008', bg2: '#713f12', accent: '#fef08a', badge: 'EVENT GRADE', headline: 'CANDLELIT', sub: 'SPARK BY DEBBIE', motif: 'star' },
  };

  const p = palettes[artKey] || palettes['rayon-guide'];
  const uid = (artKey || 'custom').replace(/[^a-z0-9]/gi, '') + '_' + (client || 'p').replace(/[^a-z0-9]/gi, '').slice(0, 6);
  const safeClient = escapeHtml(client || 'PROJECT');

  let motifMarkup = '';
  if (p.motif === 'rings') {
    motifMarkup = `<circle cx="290" cy="70" r="88" stroke="${p.accent}" stroke-width="2" fill="none" opacity="0.35"/><circle cx="290" cy="70" r="56" stroke="${p.accent}" stroke-width="8" fill="none" opacity="0.22"/><circle cx="65" cy="295" r="70" fill="${p.accent}" opacity="0.14"/>`;
  } else if (p.motif === 'arch') {
    motifMarkup = `<path d="M85 310 V140 A95 95 0 0 1 275 140 V310" stroke="${p.accent}" stroke-width="2.5" fill="none" opacity="0.45"/><path d="M110 310 V152 A70 70 0 0 1 250 152 V310" fill="${p.accent}" opacity="0.12"/>`;
  } else if (p.motif === 'diamond') {
    motifMarkup = `<polygon points="180,45 310,180 180,315 50,180" stroke="${p.accent}" stroke-width="2" fill="none" opacity="0.42"/><polygon points="180,82 272,180 180,278 88,180" fill="${p.accent}" opacity="0.12"/>`;
  } else if (p.motif === 'star') {
    motifMarkup = `<path d="M275 45 L286 82 L323 93 L286 104 L275 141 L264 104 L227 93 L264 82 Z" fill="${p.accent}" opacity="0.82"/><circle cx="90" cy="270" r="90" fill="${p.accent}" opacity="0.12"/>`;
  } else if (p.motif === 'orb') {
    motifMarkup = `<circle cx="260" cy="115" r="92" fill="${p.accent}" opacity="0.24"/><circle cx="110" cy="260" r="65" stroke="${p.accent}" stroke-width="2" fill="none" opacity="0.4"/>`;
  } else if (p.motif === 'bars') {
    motifMarkup = `<rect x="235" y="40" width="24" height="120" rx="12" fill="${p.accent}" opacity="0.35"/><rect x="270" y="70" width="24" height="90" rx="12" fill="${p.accent}" opacity="0.55"/><rect x="305" y="25" width="24" height="135" rx="12" fill="${p.accent}" opacity="0.25"/>`;
  } else if (p.motif === 'stripes') {
    motifMarkup = `<line x1="-20" y1="90" x2="170" y2="-20" stroke="${p.accent}" stroke-width="14" opacity="0.14"/><line x1="180" y1="380" x2="380" y2="210" stroke="${p.accent}" stroke-width="18" opacity="0.18"/>`;
  } else {
    motifMarkup = `<path d="M255 95 A45 45 0 1 0 305 95" stroke="${p.accent}" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.55"/><path d="M280 55 L294 90 L286 112 H274 L266 90 Z" fill="#FFFFFF" opacity="0.7"/>`;
  }

  return `
    <svg viewBox="0 0 360 360" class="w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pg-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${p.bg1}"/>
          <stop offset="100%" stop-color="${p.bg2}"/>
        </linearGradient>
      </defs>
      <rect width="360" height="360" fill="url(#pg-${uid})"/>
      ${motifMarkup}
      <rect x="18" y="18" width="324" height="324" rx="20" stroke="#ffffff" stroke-opacity="0.18" fill="none" stroke-width="1.5"/>
      <rect x="34" y="34" width="134" height="28" rx="14" fill="${p.accent}" fill-opacity="0.22" stroke="${p.accent}" stroke-opacity="0.65"/>
      <text x="101" y="52" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="10" font-weight="800" letter-spacing="1.4">${p.badge}</text>
      <text x="34" y="206" fill="#FFFFFF" font-family="Syne, Montserrat, sans-serif" font-size="38" font-weight="800" letter-spacing="-0.5">${escapeHtml(client ? client.toUpperCase().slice(0, 12) : p.headline)}</text>
      <text x="34" y="234" fill="${p.accent}" font-family="Montserrat, sans-serif" font-size="12.5" font-weight="700" letter-spacing="2.2">${p.sub}</text>
      <line x1="34" y1="286" x2="326" y2="286" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1"/>
      <text x="34" y="312" fill="#ffffff" fill-opacity="0.82" font-family="Inter, sans-serif" font-size="11" font-weight="600">${safeClient.toUpperCase()} — RAY-ON</text>
      <circle cx="316" cy="308" r="5" fill="${p.accent}"/>
    </svg>
  `;
}
