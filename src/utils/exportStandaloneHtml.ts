import type { PortfolioConfig } from '../types/portfolio';
import { deepClone } from './svgArtwork';

async function inlineLocalAssetAsDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('blob:') || url.startsWith('/src/assets/')) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (blob.size > 2_500_000) return url.startsWith('blob:') ? null : url;
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
  return url;
}

export async function prepareConfigForStandaloneExport(config: PortfolioConfig): Promise<PortfolioConfig> {
  const cloned = deepClone(config);
  const cache = new Map<string, string | null>();

  const resolveCached = async (url: string | null | undefined): Promise<string | null> => {
    if (!url) return null;
    if (cache.has(url)) return cache.get(url) ?? null;
    const resolved = await inlineLocalAssetAsDataUrl(url);
    cache.set(url, resolved);
    return resolved;
  };

  for (const key of Object.keys(cloned.images) as Array<keyof PortfolioConfig['images']>) {
    cloned.images[key] = await resolveCached(cloned.images[key]);
  }

  for (const col of ['identityProjects', 'flyerProjects', 'photoProjects'] as const) {
    for (const item of cloned[col]) {
      item.image = await resolveCached(item.image);
      if (item.fallbackImage) {
        item.fallbackImage = await resolveCached(item.fallbackImage);
      }
    }
  }

  for (const reel of cloned.videoReels) {
    reel.posterUrl = await resolveCached(reel.posterUrl);
    reel.gifUrl = await resolveCached(reel.gifUrl);
    if (reel.videoUrl && reel.videoUrl.startsWith('blob:')) {
      reel.videoUrl = null;
    }
  }

  if (cloned.cv?.fileUrl) {
    cloned.cv.fileUrl = await resolveCached(cloned.cv.fileUrl);
  }

  for (const aff of cloned.affiliations || []) {
    aff.logoUrl = await resolveCached(aff.logoUrl);
  }

  return cloned;
}

export function generateStandaloneIndexHtml(config: PortfolioConfig): string {
  const safeJson = JSON.stringify(config, null, 2).replace(/<\/script>/gi, '<\\/script>');
  const safeTitle = (config.copy.siteTitle || 'Raymond Ajimuda — Creative Director | Ray-On Brand Agency')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <meta name="description" content="Portfolio of Raymond Ajimuda, Creative Director at Ray-On Brand Agency & Product & Content Innovation Associate at Giveday. Brand identity, AI video ads, motion design, UGC, and studio photography." />
  <meta name="theme-color" content="#080808" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="Brand Design • AI Ads • Creative Direction • Motion & Photography." />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23080808'/%3E%3Cpath d='M20 20 A16 16 0 1 0 44 20' stroke='%23E60A15' stroke-width='5.5' stroke-linecap='round' fill='none'/%3E%3Cpath d='M32 10 L39 27 L35 37 H29 L25 27 Z' fill='%23ffffff'/%3E%3C/svg%3E" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@600;700;800;900&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            syne: ['Syne', 'sans-serif'],
            montserrat: ['Montserrat', 'sans-serif'],
            inter: ['Inter', 'sans-serif'],
            caveat: ['Caveat', 'cursive'],
          },
          colors: {
            obsidian: '#080808',
            crimson: '#E60A15',
            crimsonDark: '#8B0000',
            crimsonDeep: '#2B0000',
          },
        },
      },
    };
  </script>
  <style>
    :root { --obsidian: #080808; --crimson: #E60A15; --crimson-dark: #8B0000; --crimson-deep: #2B0000; }
    html, body { max-width: 100%; overflow-x: hidden; }
    body { background-color: var(--obsidian); color: #fff; font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
    select, input, textarea { color-scheme: dark; }
    .bg-editorial-dark {
      background:
        radial-gradient(circle at 86% 8%, rgba(190, 0, 16, 0.34) 0%, transparent 40%),
        radial-gradient(circle at 8% 34%, rgba(139, 0, 0, 0.25) 0%, transparent 44%),
        radial-gradient(circle at 92% 62%, rgba(230, 10, 21, 0.22) 0%, transparent 40%),
        radial-gradient(circle at 14% 86%, rgba(139, 0, 0, 0.26) 0%, transparent 42%),
        #080808;
    }
    .bg-diagonal-crimson {
      background-image: repeating-linear-gradient(-45deg, rgba(230,10,21,0.14) 0px, rgba(230,10,21,0.14) 24px, transparent 24px, transparent 50px), linear-gradient(135deg, #190204 0%, #440307 48%, #080808 100%);
    }
    .card-crimson-blush { background: linear-gradient(118deg, #E60A15 0%, #F42B37 44%, #FFB9BF 80%, #FFF2F3 100%); }
    .card-crimson-vibrant { background: linear-gradient(134deg, #E60A15 0%, #FA2A37 48%, #FF969D 85%, #FFE7E9 100%); }
    .grid-frame-striped { position: relative; background: repeating-linear-gradient(-45deg, rgba(230,10,21,0.94) 0px, rgba(230,10,21,0.94) 26px, rgba(255,130,138,0.72) 26px, rgba(255,130,138,0.72) 52px), linear-gradient(125deg, #E60A15 0%, #FF4E59 50%, #FFFFFF 100%); }
    .grid-frame-striped::before { content: ''; position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(130deg, rgba(230,10,21,0.44) 0%, rgba(255,255,255,0.80) 100%); pointer-events: none; }
    .grid-frame-obsidian { position: relative; background: repeating-linear-gradient(-45deg, rgba(230,10,21,0.12) 0px, rgba(230,10,21,0.12) 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 40px), linear-gradient(145deg, #160406 0%, #0B0B0B 60%, #1C0407 100%); }
    .editorial-divider { height: 1px; background: linear-gradient(90deg, rgba(230,10,21,0.92) 0%, rgba(255,255,255,0.68) 54%, rgba(230,10,21,0.14) 100%); }
    .btn-crimson-pill { background: linear-gradient(90deg, #E60A15 0%, #FF3B47 46%, #FFFFFF 100%); transition: transform 0.36s cubic-bezier(0.22,1,0.36,1), box-shadow 0.36s ease; }
    .btn-crimson-pill:hover { transform: scale(1.055); box-shadow: 0 0 32px rgba(230,10,21,0.68); }
    .text-crimson-white { background: linear-gradient(90deg, #E60A15 0%, #FF5C66 48%, #FFFFFF 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .text-brush-gradient { background: linear-gradient(112deg, #E60A15 8%, #FF4853 54%, #FFFFFF 96%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-box-decoration-break: clone; box-decoration-break: clone; padding-right: 0.16em; }
    .logo-blend-lighten { mix-blend-mode: lighten; }
    .logo-blend-screen { mix-blend-mode: screen; }
    .hero-portrait-feather { -webkit-mask-image: radial-gradient(ellipse 84% 88% at 50% 48%, #000 66%, rgba(0,0,0,0.72) 84%, transparent 100%); mask-image: radial-gradient(ellipse 84% 88% at 50% 48%, #000 66%, rgba(0,0,0,0.72) 84%, transparent 100%); }
    .morph-portrait { border-radius: 1.75rem; transition: border-radius 0.65s cubic-bezier(0.34,1.56,0.64,1), transform 0.52s cubic-bezier(0.22,1,0.36,1), box-shadow 0.52s ease, border-color 0.42s ease; transform-style: preserve-3d; cursor: pointer; }
    .morph-portrait-media { transition: transform 0.62s cubic-bezier(0.22,1,0.36,1), filter 0.55s ease; }
    .morph-portrait.monochrome .morph-portrait-media { filter: grayscale(100%) contrast(1.18) brightness(0.98); }
    .morph-portrait-hero:hover, .morph-portrait-hero.is-morphed { border-radius: 44% 56% 42% 58% / 36% 44% 56% 64%; transform: scale(1.075) translateY(-6px); border-color: rgba(255,255,255,0.85); box-shadow: 0 0 64px rgba(230,10,21,0.74), 0 24px 48px rgba(0,0,0,0.82); }
    .morph-portrait-bento:hover, .morph-portrait-bento.is-morphed { border-radius: 58% 42% 34% 66% / 42% 58% 42% 58%; transform: scale(1.085) rotate(-1.5deg); box-shadow: 0 22px 44px rgba(230,10,21,0.56), 0 0 0 3px rgba(255,255,255,0.82); }
    .morph-portrait-bento:hover .morph-portrait-media, .morph-portrait-bento.is-morphed .morph-portrait-media { transform: scale(1.09); filter: grayscale(0%) contrast(1.06) saturate(1.22); }
    .portfolio-grid-group:hover .portfolio-tile:not(:hover), .portfolio-grid-group.has-touch-active .portfolio-tile:not(.is-morphed) { opacity: 0.62; transform: scale(0.968); }
    .portfolio-tile { border-radius: 1.25rem; transition: border-radius 0.52s cubic-bezier(0.34,1.56,0.64,1), transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease, box-shadow 0.45s ease; cursor: pointer; }
    .portfolio-tile:hover, .portfolio-tile.is-morphed { border-radius: 34px 10px 34px 10px; transform: scale(1.052) translateY(-7px); box-shadow: 0 22px 42px rgba(0,0,0,0.72), 0 0 30px rgba(230,10,21,0.52); z-index: 20; opacity: 1 !important; }
    .portfolio-tile .tile-art { transition: transform 0.55s cubic-bezier(0.22,1,0.36,1); }
    .portfolio-tile:hover .tile-art, .portfolio-tile.is-morphed .tile-art { transform: scale(1.08); }
    .portfolio-tile .tile-overlay { opacity: 0; transform: translateY(14px); transition: opacity 0.34s ease, transform 0.38s cubic-bezier(0.22,1,0.36,1); }
    .portfolio-tile:hover .tile-overlay, .portfolio-tile.is-morphed .tile-overlay { opacity: 1; transform: translateY(0); }
    .retouch-raw-filter { filter: saturate(0.38) contrast(0.84) brightness(1.06) sepia(0.14); }
    .retouch-graded-filter { filter: contrast(1.16) saturate(1.24) brightness(1.02); }
    .tool-tile { border-radius: 0.95rem; transition: border-radius 0.46s cubic-bezier(0.34,1.56,0.64,1), transform 0.44s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease; }
    .tool-tile:hover { border-radius: 50%; transform: scale(1.16) translateY(-7px) rotate(-5deg); }
    @keyframes marquee-rtl { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(-50%,0,0); } }
    .marquee-mask { -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%); mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%); }
    .marquee-track { display: flex; width: max-content; will-change: transform; animation: marquee-rtl var(--marquee-duration, 32s) linear infinite; }
    .marquee-container:hover .marquee-track { animation-play-state: paused; }
  </style>
</head>
<body class="bg-editorial-dark text-white antialiased selection:bg-crimson selection:text-white">
  <script id="portfolio-config-data" type="application/json">${safeJson}</script>
  <div id="app"></div>
  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
    import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
    import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

    const DEFAULT_CFG = JSON.parse(document.getElementById('portfolio-config-data').textContent);
    const firebaseConfig = {
      apiKey: "AIzaSyDG13UuwidO2MkhkyibF9Eyz2E7HNZYHHU",
      authDomain: "rayon-portfolio.firebaseapp.com",
      projectId: "rayon-portfolio",
      storageBucket: "rayon-portfolio.firebasestorage.app",
      messagingSenderId: "657127311781",
      appId: "1:657127311781:web:21f6989266b0027368004c",
      measurementId: "G-2SPELX52F6"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    getAuth(app);

    const mergeCfg = (base, saved) => {
      if (!saved || typeof saved !== 'object') return base;
      return {
        ...base,
        ...saved,
        profile: { ...base.profile, ...(saved.profile || {}) },
        copy: { ...base.copy, ...(saved.copy || {}) },
        images: { ...base.images, ...(saved.images || {}) },
        imageLightBg: { ...(base.imageLightBg || {}), ...(saved.imageLightBg || {}) },
        cv: { ...(base.cv || {}), ...(saved.cv || {}) },
        services: Array.isArray(saved.services) ? saved.services : base.services,
        tools: Array.isArray(saved.tools) ? saved.tools : base.tools,
        identityProjects: Array.isArray(saved.identityProjects) ? saved.identityProjects : base.identityProjects,
        flyerProjects: Array.isArray(saved.flyerProjects) ? saved.flyerProjects : base.flyerProjects,
        videoReels: Array.isArray(saved.videoReels) ? saved.videoReels : base.videoReels,
        photoProjects: Array.isArray(saved.photoProjects) ? saved.photoProjects : base.photoProjects,
        testimonials: Array.isArray(saved.testimonials) ? saved.testimonials : base.testimonials,
        affiliations: Array.isArray(saved.affiliations) ? saved.affiliations : (base.affiliations || []),
      };
    };

    const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const rich = (s) => esc(s).replace(/\\*\\*([^*]+)\\*\\*/g,'<strong class="font-bold">$1</strong>').replace(/\\*([^*]+)\\*/g,'<em>$1</em>').replace(/(mygiveday\\.com)/gi,'<a href="https://mygiveday.com" target="_blank" rel="noopener noreferrer" class="font-bold underline">$1</a>').replace(/\\n/g,'<br/>');
    const logoSvg = '<svg viewBox="0 0 120 120" class="w-full h-full object-contain" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rc" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#C8083B"/><stop offset="50%" stop-color="#E60A15"/><stop offset="100%" stop-color="#FF6B1A"/></linearGradient></defs><path d="M38 34 A30 30 0 1 0 82 34" stroke="url(#rc)" stroke-width="8.5" stroke-linecap="round" fill="none"/><path d="M60 15 L73 45 L66 64 H54 L47 45 Z" fill="url(#rc)"/><circle cx="60" cy="45" r="3.6" fill="#080808"/><rect x="52" y="67" width="16" height="6.5" rx="1.5" fill="url(#rc)"/><text x="60" y="102" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="14" font-weight="900" letter-spacing="2">RAY-ON</text></svg>';
    const imgOrFallback = (src, alt, cls) => src ? '<img src="' + esc(src) + '" alt="' + esc(alt) + '" class="' + cls + '" />' : '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-crimson/35 to-obsidian p-4 text-center font-syne font-extrabold text-sm">' + esc(alt) + '</div>';
    const tileHtml = (p, sec) => { const light = Boolean(p.lightBg && (p.image || p.gifUrl || p.posterUrl)); return '<article data-sec="' + sec + '" data-id="' + esc(p.id) + '" class="portfolio-tile relative aspect-square overflow-hidden ' + (light ? 'bg-white' : 'bg-obsidian') + ' border border-white/20 shadow-lg"><div class="tile-art w-full h-full ' + (light ? 'p-5 flex items-center justify-center' : '') + '">' + imgOrFallback(p.image || p.gifUrl || p.posterUrl, p.client + ' — ' + p.title, light ? 'w-full h-full object-contain' : 'w-full h-full object-cover object-top') + '</div><div class="tile-overlay absolute inset-x-2.5 bottom-2.5 rounded-2xl bg-obsidian/90 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2"><div class="min-w-0"><span class="block text-[10px] font-bold uppercase tracking-widest text-crimson">' + esc(p.category) + '</span><h3 class="font-montserrat text-xs sm:text-sm font-extrabold text-white truncate">' + esc(p.client) + '</h3><p class="text-[11px] text-zinc-300 truncate">' + esc(p.title) + '</p></div><span class="shrink-0 px-2.5 py-1.5 rounded-full bg-crimson text-[10px] font-bold text-white">View →</span></div></article>'; };

    function renderPortfolio(CFG) {
      document.title = CFG.copy.siteTitle || document.title;
      const logoLight = Boolean(CFG.images.logoPrimary && CFG.imageLightBg && CFG.imageLightBg.logoPrimary);
      document.getElementById('app').innerHTML = \`
        <header class="sticky top-0 z-40 backdrop-blur-xl bg-obsidian/90 border-b border-white/10">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <a href="#top" class="flex items-center gap-2.5"><div class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center \${logoLight ? 'bg-white p-1' : ''}">\${CFG.images.logoPrimary ? '<img src="'+esc(CFG.images.logoPrimary)+'" class="w-full h-full object-contain '+(logoLight ? '' : 'logo-blend-lighten')+'"/>' : logoSvg}</div><div><span class="block font-syne text-sm font-extrabold tracking-[0.22em]">\${esc(CFG.copy.navBrandName)}</span><span class="block text-[9px] tracking-[0.16em] text-zinc-400 uppercase">\${esc(CFG.copy.navBrandSub)}</span></div></a>
            <nav class="hidden md:flex items-center gap-5 text-[11px] font-montserrat font-semibold tracking-widest uppercase text-zinc-300">
              <a href="#about" class="hover:text-crimson">\${esc(CFG.copy.navAbout)}</a>
              <a href="#branding" class="hover:text-crimson">\${esc(CFG.copy.navBranding)}</a>
              <a href="#flyers" class="hover:text-crimson">\${esc(CFG.copy.navFlyers)}</a>
              <a href="#videos" class="hover:text-crimson">\${esc(CFG.copy.navVideos)}</a>
              <a href="#photography" class="hover:text-crimson">\${esc(CFG.copy.navPhotography)}</a>
              <a href="#reviews" class="hover:text-crimson">\${esc(CFG.copy.navReviews)}</a>
            </nav>
            <a href="#contact" class="btn-crimson-pill px-4 py-2 rounded-full text-[11px] font-montserrat font-extrabold text-obsidian">\${esc(CFG.copy.heroCtaLabel)}</a>
          </div>
        </header>
        <main id="top" class="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-20">
          <section class="text-center space-y-6">
            <p class="text-xs font-montserrat font-bold tracking-[0.2em] uppercase text-crimson">\${esc(CFG.copy.heroTopStrip)}</p>
            <div class="mx-auto morph-portrait morph-portrait-hero w-64 h-80 sm:w-80 sm:h-[400px] overflow-hidden border-2 border-crimson/55 bg-obsidian shadow-[0_0_54px_rgba(230,10,21,0.42)]">
              <div class="morph-portrait-media hero-portrait-feather w-full h-full">\${imgOrFallback(CFG.images.heroPortrait, CFG.profile.name, 'w-full h-full object-cover object-top')}</div>
            </div>
            <h1 class="font-syne text-5xl sm:text-7xl md:text-8xl font-extrabold">\${esc(CFG.copy.heroTitle)}</h1>
            <p class="font-montserrat text-base sm:text-2xl font-bold text-crimson-white">\${esc(CFG.copy.heroSubtitle)}</p>
          </section>
          <section id="about" class="space-y-6">
            <div class="editorial-divider"></div>
            <div class="card-crimson-blush rounded-[2rem] p-6 sm:p-9 grid md:grid-cols-12 gap-6 items-center">
              <div class="md:col-span-7 space-y-3 text-white">
                <h2 class="font-montserrat text-2xl sm:text-3xl font-extrabold uppercase">\${esc(CFG.copy.aboutHeading)}</h2>
                <p class="text-sm sm:text-base leading-relaxed">\${rich(CFG.copy.aboutBio1)}</p>
                <p class="text-xs sm:text-sm leading-relaxed">\${rich(CFG.copy.aboutBio2)}</p>
                <p class="text-xs sm:text-sm leading-relaxed">\${rich(CFG.copy.aboutBio3)}</p>
              </div>
              <div class="md:col-span-5 flex justify-center">
                <div class="morph-portrait morph-portrait-bento monochrome w-56 h-64 sm:w-64 sm:h-72 overflow-hidden bg-obsidian border-2 border-white/80"><div class="morph-portrait-media w-full h-full">\${imgOrFallback(CFG.images.aboutPortrait, CFG.profile.name, 'w-full h-full object-cover object-top')}</div></div>
              </div>
            </div>
            <div class="card-crimson-vibrant rounded-[2rem] p-6 sm:p-8 grid md:grid-cols-2 gap-6">
              <div class="space-y-4">
                <h3 class="font-montserrat text-xl font-extrabold uppercase">\${esc(CFG.copy.experienceHeading)}</h3>
                <div class="flex flex-wrap items-center gap-2.5">
                  <div class="inline-block px-4 py-1.5 rounded-full border-2 border-white text-xs font-bold">\${esc(CFG.profile.experience)}</div>
                  \${CFG.cv && CFG.cv.fileUrl ? '<a href="'+esc(CFG.cv.fileUrl)+'" download="'+esc(CFG.cv.fileName || 'Raymond_Ajimuda_CV.pdf')+'" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-crimson text-xs font-extrabold shadow-md hover:scale-105 transition-transform">↓ '+esc(CFG.cv.buttonLabel || 'Download CV')+'</a>' : ''}
                </div>
                <h3 class="font-montserrat text-lg font-extrabold uppercase pt-2">\${esc(CFG.copy.whatIDoHeading)}</h3>
                <div class="flex flex-wrap gap-2">\${CFG.services.map(s => '<span class="px-3 py-1.5 rounded-full bg-obsidian/30 border border-white/40 text-[11px] font-semibold">'+esc(s)+'</span>').join('')}</div>
              </div>
              <div class="space-y-4">
                <h3 class="font-montserrat text-xl font-extrabold uppercase">\${esc(CFG.copy.toolsHeading)}</h3>
                <div class="grid grid-cols-4 gap-2.5">\${CFG.tools.map(t => '<div class="tool-tile aspect-square flex flex-col items-center justify-center p-1.5 border-2 text-center" style="background:'+esc(t.bg)+';border-color:'+esc(t.border)+'"><span class="font-bold text-sm" style="color:'+esc(t.color)+'">'+esc(t.badge)+'</span><span class="text-[8px] truncate max-w-full">'+esc(t.name.split(' ')[0])+'</span></div>').join('')}</div>
              </div>
            </div>
          </section>
          <section id="branding" class="space-y-6">
            <div class="editorial-divider"></div>
            <h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span class="text-crimson">\${esc(CFG.copy.brandingTitleAccent)}</span> \${esc(CFG.copy.brandingTitleRest)}</h2>
            <div class="grid-frame-striped rounded-[2rem] p-5"><div class="portfolio-grid-group relative z-10 grid sm:grid-cols-2 md:grid-cols-3 gap-4">\${CFG.identityProjects.map(p => tileHtml(p,'identity')).join('')}</div></div>
          </section>
          <section id="flyers" class="space-y-6">
            <div class="editorial-divider"></div>
            <h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span class="text-crimson">\${esc(CFG.copy.flyersTitleAccent)}</span> \${esc(CFG.copy.flyersTitleRest)}</h2>
            <div class="grid-frame-striped rounded-[2rem] p-5"><div class="portfolio-grid-group relative z-10 grid sm:grid-cols-2 md:grid-cols-3 gap-4">\${CFG.flyerProjects.map(p => tileHtml(p,'flyers')).join('')}</div></div>
          </section>
          <section id="videos" class="space-y-6">
            <div class="editorial-divider"></div>
            <h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span class="text-crimson">\${esc(CFG.copy.videosTitleAccent)}</span> \${esc(CFG.copy.videosTitleRest)}</h2>
            <div class="grid-frame-obsidian rounded-[2rem] p-5 border border-crimson/35"><div class="portfolio-grid-group grid sm:grid-cols-2 lg:grid-cols-3 gap-4">\${CFG.videoReels.map(p => tileHtml(p,'videos')).join('')}</div></div>
          </section>
          <section id="photography" class="space-y-6">
            <div class="editorial-divider"></div>
            <h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span class="text-crimson">\${esc(CFG.copy.photoTitleAccent)}</span> \${esc(CFG.copy.photoTitleRest)}</h2>
            <div class="portfolio-grid-group grid sm:grid-cols-2 md:grid-cols-3 gap-4">\${CFG.photoProjects.map(p => tileHtml(p,'photos')).join('')}</div>
          </section>
          <section id="reviews" class="space-y-6">
            <div class="editorial-divider"></div>
            <h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span class="text-crimson">\${esc(CFG.copy.reviewsTitleAccent)}</span> \${esc(CFG.copy.reviewsTitleRest)}</h2>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">\${CFG.testimonials.map(t => '<div class="rounded-3xl bg-white/[0.04] border border-white/10 p-6 flex flex-col justify-between gap-4"><div><div class="text-amber-400 text-sm mb-3">'+'★'.repeat(Math.max(1,Math.min(5,t.rating||5)))+'</div><p class="text-sm text-zinc-200">'+esc(t.quote)+'</p></div><div class="pt-3 border-t border-white/10"><p class="font-bold text-sm">'+esc(t.brand)+'</p><p class="text-xs text-zinc-400">'+esc(t.author)+' • '+esc(t.sector)+'</p></div></div>').join('')}</div>
          </section>
        </main>
        <footer id="contact" class="bg-diagonal-crimson border-t border-crimson/40 py-14 px-4 sm:px-6 mt-12">
          <div class="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div class="space-y-4 max-w-xl">
              <h2 class="font-caveat text-7xl font-bold text-brush-gradient leading-[1.04] inline-block px-2 pr-8 py-2">\${esc(CFG.copy.closingThankYou).replace(/\\n/g,'<br/>')}</h2>
              <p class="text-sm text-zinc-200">\${rich(CFG.copy.closingSummary)}</p>
              <div class="flex flex-wrap gap-3">
                <a href="\${esc(CFG.profile.whatsappUrl)}" target="_blank" rel="noopener noreferrer" class="btn-crimson-pill px-5 py-2.5 rounded-full text-xs font-extrabold text-obsidian">\${esc(CFG.copy.closingWhatsappCta)}</a>
                <a href="mailto:\${esc(CFG.profile.email)}" class="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">\${esc(CFG.copy.closingEmailCta)}</a>
                \${CFG.cv && CFG.cv.fileUrl ? '<a href="'+esc(CFG.cv.fileUrl)+'" download="'+esc(CFG.cv.fileName || 'Raymond_Ajimuda_CV.pdf')+'" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-full bg-white/15 border border-white/30 text-xs font-bold text-white">↓ '+esc(CFG.cv.buttonLabel || 'Download CV')+'</a>' : ''}
                <a href="\${esc(CFG.profile.instagramUrl)}" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold">\${esc(CFG.profile.instagramHandle)}</a>
              </div>
              <p class="text-xs text-zinc-400 pt-2">\${esc(CFG.copy.copyrightText)}</p>
            </div>
            <div class="w-44 rounded-3xl bg-gradient-to-br from-crimson via-[#ff6872] to-white p-4 text-center">
              <div class="w-32 h-32 mx-auto rounded-2xl bg-white p-2 flex items-center justify-center"><img src="\${esc(CFG.images.qrCode || CFG.profile.qrApiUrl)}" alt="QR" class="w-full h-full object-contain"/></div>
              <p class="mt-2 text-[11px] font-extrabold text-obsidian">\${esc(CFG.copy.qrCaption)}</p>
            </div>
          </div>
          \${(CFG.affiliations && CFG.affiliations.length) ? (
            '<div class="mt-10 pt-7 border-t border-crimson/30">' +
              '<div class="max-w-5xl mx-auto mb-4">' +
                '<p class="text-[11px] font-montserrat font-extrabold tracking-[0.22em] uppercase text-crimson">' + esc(CFG.copy.affiliationsHeading || 'ORGANIZATIONS & AFFILIATIONS') + '</p>' +
              '</div>' +
              '<div class="marquee-container marquee-mask overflow-hidden py-1">' +
                '<div class="marquee-track" style="--marquee-duration:' + Math.max(22, CFG.affiliations.length * 4.5) + 's">' +
                  [0, 1].map(() =>
                    '<div class="flex items-center gap-4 pr-4 shrink-0">' +
                      CFG.affiliations.map(a => {
                        const logo = a.logoUrl
                          ? '<img src="' + esc(a.logoUrl) + '" alt="' + esc(a.name) + '" class="max-w-full max-h-full object-contain" />'
                          : '<span class="font-syne text-sm font-extrabold tracking-[0.16em] uppercase text-white/85">' + esc((a.name || 'ORG').split(/\\s+/).slice(0,2).map(w => w[0] || '').join('').toUpperCase()) + '</span>';
                        const bgCls = (a.logoUrl && a.lightLogoBg) ? 'bg-white border-white/85' : 'bg-white/[0.04] border-white/10';
                        return '<div title="' + esc(a.name) + '" class="h-16 w-32 rounded-2xl px-4 py-2.5 flex items-center justify-center border shrink-0 overflow-hidden ' + bgCls + '">' + logo + '</div>';
                      }).join('') +
                    '</div>'
                  ).join('') +
                '</div>' +
              '</div>' +
            '</div>'
          ) : ''}
        </footer>
      \`;
    }

    renderPortfolio(DEFAULT_CFG);
    getDoc(doc(db, 'portfolio', 'main'))
      .then((snap) => {
        if (snap.exists()) {
          renderPortfolio(mergeCfg(DEFAULT_CFG, snap.data()));
        }
      })
      .catch(() => {});
  </script>
</body>
</html>`;
}
