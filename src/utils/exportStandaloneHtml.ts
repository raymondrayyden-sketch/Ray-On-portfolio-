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
      if (blob.type && blob.type.startsWith('video/')) return null;
      if (blob.size > 95_000) return url.startsWith('blob:') ? null : null;
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

const STANDALONE_HTML_TEMPLATE = String.raw`<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>__SITE_TITLE__</title>
  <meta name="description" content="Portfolio of Raymond Ajimuda, Creative Director at Ray-On Brand Agency & Product & Content Innovation Associate at Giveday. Brand identity, AI video ads, motion design, UGC, and studio photography." />
  <meta name="theme-color" content="#080808" />
  <meta property="og:title" content="__SITE_TITLE__" />
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
    .hero-portrait-feather { -webkit-mask-image: radial-gradient(ellipse 84% 88% at 50% 48%, #000 66%, rgba(0,0,0,0.72) 84%, transparent 100%); mask-image: radial-gradient(ellipse 84% 88% at 50% 48%, #000 66%, rgba(0,0,0,0.72) 84%, transparent 100%); }
    .morph-portrait { border-radius: 1.75rem; transition: border-radius 0.65s cubic-bezier(0.34,1.56,0.64,1), transform 0.52s cubic-bezier(0.22,1,0.36,1), box-shadow 0.52s ease, border-color 0.42s ease; transform-style: preserve-3d; cursor: pointer; }
    .morph-portrait-media { transition: transform 0.62s cubic-bezier(0.22,1,0.36,1), filter 0.55s ease; }
    .morph-portrait.monochrome .morph-portrait-media { filter: grayscale(100%) contrast(1.18) brightness(0.98); }
    .morph-portrait-hero:hover, .morph-portrait-hero.is-morphed { border-radius: 44% 56% 42% 58% / 36% 44% 56% 64%; transform: scale(1.075) translateY(-6px); border-color: rgba(255,255,255,0.85); box-shadow: 0 0 64px rgba(230,10,21,0.74), 0 24px 48px rgba(0,0,0,0.82); }
    .morph-portrait-bento:hover, .morph-portrait-bento.is-morphed { border-radius: 58% 42% 34% 66% / 42% 58% 42% 58%; transform: scale(1.085) rotate(-1.5deg); box-shadow: 0 22px 44px rgba(230,10,21,0.56), 0 0 0 3px rgba(255,255,255,0.82); }
    .morph-portrait-bento:hover .morph-portrait-media, .morph-portrait-bento.is-morphed .morph-portrait-media { transform: scale(1.09); filter: grayscale(0%) contrast(1.06) saturate(1.22); }
    .portfolio-grid-group:hover .portfolio-tile:not(:hover) { opacity: 0.62; transform: scale(0.968); }
    .portfolio-tile { border-radius: 1.25rem; transition: border-radius 0.52s cubic-bezier(0.34,1.56,0.64,1), transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease, box-shadow 0.45s ease; cursor: pointer; }
    .portfolio-tile:hover, .portfolio-tile.is-morphed { border-radius: 34px 10px 34px 10px; transform: scale(1.052) translateY(-7px); box-shadow: 0 22px 42px rgba(0,0,0,0.72), 0 0 30px rgba(230,10,21,0.52); z-index: 20; opacity: 1 !important; }
    .portfolio-tile .tile-art { transition: transform 0.55s cubic-bezier(0.22,1,0.36,1); }
    .portfolio-tile:hover .tile-art, .portfolio-tile.is-morphed .tile-art { transform: scale(1.08); }
    .portfolio-tile .tile-overlay { opacity: 0; transform: translateY(14px); transition: opacity 0.34s ease, transform 0.38s cubic-bezier(0.22,1,0.36,1); }
    .portfolio-tile:hover .tile-overlay, .portfolio-tile.is-morphed .tile-overlay { opacity: 1; transform: translateY(0); }
    .reel-tile .reel-playing-badge { opacity: 0; transform: translateY(-4px); transition: opacity 0.25s ease, transform 0.25s ease; }
    .reel-tile.is-playing .reel-playing-badge { opacity: 1; transform: translateY(0); }
    .reel-tile.is-playing .reel-idle-badge { opacity: 0; }
    .retouch-raw-filter { filter: saturate(0.38) contrast(0.84) brightness(1.06) sepia(0.14); }
    .retouch-graded-filter { filter: contrast(1.16) saturate(1.24) brightness(1.02); }
    .tool-tile { border-radius: 0.95rem; transition: border-radius 0.46s cubic-bezier(0.34,1.56,0.64,1), transform 0.44s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease; }
    .tool-tile:hover { border-radius: 50%; transform: scale(1.16) translateY(-7px) rotate(-5deg); }
    .dropzone-active { border-color: #E60A15 !important; background-color: rgba(230,10,21,0.18) !important; transform: scale(1.01); }
    body.edit-mode-active [data-copy-key] { outline: 1.5px dashed rgba(230,10,21,0.85); outline-offset: 4px; border-radius: 6px; cursor: text; }
    @keyframes marquee-rtl { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(-50%,0,0); } }
    .marquee-mask { -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%); mask-image: linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%); }
    .marquee-track { display: flex; width: max-content; will-change: transform; animation: marquee-rtl var(--marquee-duration, 32s) linear infinite; }
    .marquee-container:hover .marquee-track { animation-play-state: paused; }
  </style>
</head>
<body class="bg-editorial-dark text-white antialiased selection:bg-crimson selection:text-white">
  <script id="portfolio-config-data" type="application/json">__PORTFOLIO_CONFIG_JSON__</script>
  <div id="app"></div>
  <div id="lightboxRoot"></div>
  <div id="loginModalRoot"></div>
  <div id="studioDrawerRoot"></div>
  <div id="toastRoot" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] pointer-events-none"></div>

  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
    import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
    import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

    // 1. Prevent accidental browser white-screen / file navigation on drag-and-drop
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    const CLOUDINARY_CLOUD_NAME = 'urwej0rr';
    const CLOUDINARY_UPLOAD_PRESET = 'rayon_portfolio';
    const CLOUDINARY_AUTO_URL = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/auto/upload';
    const CLOUDINARY_VIDEO_URL = 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD_NAME + '/video/upload';
    const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
    const CHUNK_THRESHOLD_BYTES = 18 * 1024 * 1024;
    const CHUNK_SIZE_BYTES = 6 * 1024 * 1024;
    const MAX_INLINE_BASE64_BYTES = 100 * 1024;
    const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|ogg|ogv|avi|mkv|3gp|wmv)$/i;
    const TRANSCODE_EXT_RE = /\.(mov|mkv|avi|3gp|wmv|m4v)$/i;

    const firebaseConfig = {
      apiKey: 'AIzaSyDG13UuwidO2MkhkyibF9Eyz2E7HNZYHHU',
      authDomain: 'rayon-portfolio.firebaseapp.com',
      projectId: 'rayon-portfolio',
      storageBucket: 'rayon-portfolio.firebasestorage.app',
      messagingSenderId: '657127311781',
      appId: '1:657127311781:web:21f6989266b0027368004c',
      measurementId: 'G-2SPELX52F6'
    };

    const fbApp = initializeApp(firebaseConfig);
    const db = getFirestore(fbApp);
    const auth = getAuth(fbApp);

    const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
    const DEFAULT_PORTFOLIO_CONFIG = JSON.parse(document.getElementById('portfolio-config-data').textContent);

    let PORTFOLIO_CONFIG = deepClone(DEFAULT_PORTFOLIO_CONFIG);
    let adminUser = null;
    let isAdminRevealed = window.location.search.includes('admin=true');
    let logoTapTimestamps = [];
    let activeIdentityCategory = 'All';
    let activeVideoCategory = 'All';
    let retouchPercent = 52;
    let editMode = false;
    let drawerOpen = false;
    let activeTab = 'copy';
    let activeCollection = 'identityProjects';
    let selectedMediaSlot = 'image:heroPortrait';
    let cloudStatus = 'Default portfolio loaded';
    let cloudState = 'idle';
    let saveTimer = null;
    let toastTimer = null;
    let lightboxState = null;

    const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const rich = (s) => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/(mygiveday\.com)/gi, '<a href="https://mygiveday.com" target="_blank" rel="noopener noreferrer" class="font-bold underline">$1</a>')
      .replace(/\n/g, '<br/>');

    const isVideoFile = (file) => (file.type && file.type.startsWith('video/')) || VIDEO_EXT_RE.test(file.name || '');
    const isVideoUrl = (url) => {
      if (!url) return false;
      const clean = String(url).trim().split('?')[0];
      return clean.includes('/video/upload/') || VIDEO_EXT_RE.test(clean);
    };

    function normalizeCloudinaryVideoUrl(url) {
      if (!url || typeof url !== 'string') return url;
      const trimmed = url.trim();
      if (!trimmed.includes('res.cloudinary.com') || !trimmed.includes('/upload/')) return trimmed;
      let out = trimmed;
      if (out.includes('/upload/f_mp4,vc_auto,q_auto/')) {
        out = out.replace('/upload/f_mp4,vc_auto,q_auto/', '/upload/f_mp4,vc_h264,q_auto/');
      } else if (!out.includes('/upload/f_mp4,vc_h264,q_auto/')) {
        out = out.replace('/upload/', '/upload/f_mp4,vc_h264,q_auto/');
      }
      const parts = out.split('?');
      const base = TRANSCODE_EXT_RE.test(parts[0]) ? parts[0].replace(TRANSCODE_EXT_RE, '.mp4') : parts[0];
      return parts[1] ? base + '?' + parts[1] : base;
    }

    function deriveCloudinaryVideoPoster(url) {
      if (!url || typeof url !== 'string') return null;
      const trimmed = url.trim();
      if (!trimmed.includes('res.cloudinary.com') || !trimmed.includes('/video/upload/')) return null;
      const clean = trimmed.split('?')[0]
        .replace('/video/upload/f_mp4,vc_h264,q_auto/', '/video/upload/')
        .replace('/video/upload/f_mp4,vc_auto,q_auto/', '/video/upload/');
      return clean.replace(/\.[^./]+$/, '.jpg');
    }

    function showToast(msg) {
      const root = document.getElementById('toastRoot');
      if (!root) return;
      root.innerHTML = '<div class="px-5 py-2.5 rounded-full bg-obsidian/95 border border-crimson/70 text-xs font-semibold text-white shadow-[0_0_28px_rgba(230,10,21,0.55)] max-w-[92vw] text-center">' + esc(msg) + '</div>';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { root.innerHTML = ''; }, 3800);
    }

    function mergeConfig(base, saved) {
      const b = deepClone(base);
      if (!saved || typeof saved !== 'object') return b;
      const mergedVideos = Array.isArray(saved.videoReels)
        ? saved.videoReels.map((v) => {
            const vUrl = v.videoUrl ? normalizeCloudinaryVideoUrl(v.videoUrl) : null;
            return {
              ...v,
              videoUrl: vUrl,
              gifUrl: vUrl ? null : (v.gifUrl || null),
              posterUrl: v.posterUrl || (vUrl ? deriveCloudinaryVideoPoster(vUrl) : null),
            };
          })
        : b.videoReels;
      return {
        ...b,
        ...saved,
        profile: { ...b.profile, ...(saved.profile || {}) },
        copy: { ...b.copy, ...(saved.copy || {}) },
        images: { ...b.images, ...(saved.images || {}) },
        imageLightBg: { ...(b.imageLightBg || {}), ...(saved.imageLightBg || {}) },
        cv: { ...(b.cv || {}), ...(saved.cv || {}) },
        services: Array.isArray(saved.services) ? saved.services : b.services,
        tools: Array.isArray(saved.tools) ? saved.tools : b.tools,
        identityProjects: Array.isArray(saved.identityProjects) ? saved.identityProjects : b.identityProjects,
        flyerProjects: Array.isArray(saved.flyerProjects) ? saved.flyerProjects : b.flyerProjects,
        videoReels: mergedVideos,
        photoProjects: Array.isArray(saved.photoProjects) ? saved.photoProjects : b.photoProjects,
        testimonials: Array.isArray(saved.testimonials) ? saved.testimonials : b.testimonials,
        affiliations: Array.isArray(saved.affiliations) ? saved.affiliations : (b.affiliations || []),
      };
    }

    // 3. Strip any data: Base64 > 100 KB before Firestore setDoc to prevent 1 MB failures
    function sanitizeForFirestore(cfg) {
      const cleaned = deepClone(cfg);
      let stripped = 0;
      const cleanVal = (val, fallback) => {
        if (!val || typeof val !== 'string') return fallback;
        const t = val.trim();
        if (t.startsWith('blob:')) return fallback;
        if (t.startsWith('data:') && t.length > MAX_INLINE_BASE64_BYTES) {
          stripped += 1;
          return fallback;
        }
        return t;
      };
      Object.keys(cleaned.images || {}).forEach((k) => {
        const def = DEFAULT_PORTFOLIO_CONFIG.images[k] ?? null;
        const safeDef = (typeof def === 'string' && def.startsWith('data:') && def.length > MAX_INLINE_BASE64_BYTES) ? null : def;
        cleaned.images[k] = cleanVal(cleaned.images[k], safeDef);
      });
      const walk = (node) => {
        if (typeof node === 'string') {
          const t = node.trim();
          if (t.startsWith('blob:')) return null;
          if (t.startsWith('data:') && t.length > MAX_INLINE_BASE64_BYTES) { stripped += 1; return null; }
          return node;
        }
        if (Array.isArray(node)) return node.map(walk);
        if (node && typeof node === 'object') {
          Object.keys(node).forEach((k) => { node[k] = walk(node[k]); });
        }
        return node;
      };
      walk(cleaned);
      return { payload: cleaned, stripped };
    }

    async function saveConfigToCloud(notifySuccess = false) {
      if (!auth.currentUser) {
        cloudState = 'error';
        cloudStatus = 'Sign in required to save';
        updateStatusBadges();
        showToast('Sign in as admin to save changes to Firestore.');
        return;
      }
      cloudState = 'saving';
      cloudStatus = 'Saving...';
      updateStatusBadges();
      try {
        const { payload, stripped } = sanitizeForFirestore(PORTFOLIO_CONFIG);
        await setDoc(doc(db, 'portfolio', 'main'), {
          ...payload,
          updatedAt: new Date().toISOString(),
          updatedBy: auth.currentUser.email || auth.currentUser.uid,
        });
        cloudState = 'synced';
        if (stripped > 0) {
          cloudStatus = 'Synced (' + stripped + ' Base64 stripped)';
          showToast('Synced to Cloud, but ' + stripped + ' oversized Base64 image(s) (>100 KB) were stripped to stay under Firestore 1 MB limit. Upload via Cloudinary instead.');
        } else {
          cloudStatus = 'Synced to Cloud';
          if (notifySuccess) showToast('Synced to Cloud!');
        }
      } catch (err) {
        const msg = err && err.message ? err.message : String(err || 'Firestore save failed');
        cloudState = 'error';
        cloudStatus = 'Save failed: ' + msg;
        showToast('Firestore save error: ' + msg);
      }
      updateStatusBadges();
    }

    function scheduleCloudSave(immediate = false) {
      clearTimeout(saveTimer);
      if (immediate) {
        saveConfigToCloud(false);
      } else {
        cloudState = 'saving';
        cloudStatus = 'Saving...';
        updateStatusBadges();
        saveTimer = setTimeout(() => saveConfigToCloud(false), 550);
      }
    }

    function updateStatusBadges() {
      document.querySelectorAll('[data-cloud-status]').forEach((el) => { el.textContent = cloudStatus; });
    }

    function sendXhr(url, formData, headers, onProg) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        if (headers) Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
        xhr.upload.onprogress = (ev) => { if (ev.lengthComputable && onProg) onProg(ev.loaded, ev.total); };
        xhr.onload = () => {
          let data = {};
          try { data = JSON.parse(xhr.responseText || '{}'); } catch {}
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error((data.error && data.error.message) || ('Cloudinary HTTP ' + xhr.status)));
        };
        xhr.onerror = () => reject(new Error('Network error while uploading to Cloudinary.'));
        xhr.ontimeout = () => reject(new Error('Upload timed out.'));
        xhr.send(formData);
      });
    }

    // Raw File sent directly in FormData (never FileReader.readAsDataURL)
    async function uploadToCloudinary(file, onProgress) {
      if (!file || file.size === 0) throw new Error('Selected file is empty.');
      const isVid = isVideoFile(file);
      if (isVid && file.size > MAX_VIDEO_BYTES) {
        throw new Error('Video exceeds Cloudinary 100 MB limit (' + (file.size / 1048576).toFixed(1) + ' MB).');
      }
      const endpoint = isVid ? CLOUDINARY_VIDEO_URL : CLOUDINARY_AUTO_URL;
      let data = {};
      if (isVid && file.size > CHUNK_THRESHOLD_BYTES) {
        const total = file.size;
        const uid = 'rayon-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        let start = 0;
        while (start < total) {
          const end = Math.min(start + CHUNK_SIZE_BYTES, total);
          const fd = new FormData();
          fd.append('file', file.slice(start, end), file.name);
          fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          const cs = start;
          data = await sendXhr(endpoint, fd, {
            'X-Unique-Upload-Id': uid,
            'Content-Range': 'bytes ' + cs + '-' + (end - 1) + '/' + total
          }, (loaded) => onProgress && onProgress(Math.min(99, Math.round(((cs + loaded) / total) * 100))));
          start = end;
        }
      } else {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        data = await sendXhr(endpoint, fd, null, (loaded, total) => {
          if (total > 0 && onProgress) onProgress(Math.min(99, Math.round((loaded / total) * 100)));
        });
      }
      if (!data.secure_url) throw new Error((data.error && data.error.message) || 'Cloudinary returned no secure_url.');
      const videoResult = isVid || data.resource_type === 'video';
      return {
        secureUrl: videoResult ? normalizeCloudinaryVideoUrl(data.secure_url) : data.secure_url,
        posterUrl: videoResult ? deriveCloudinaryVideoPoster(data.secure_url) : null,
        resourceType: data.resource_type || (videoResult ? 'video' : 'auto'),
        isVideo: videoResult,
      };
    }

    const logoSvg = '<svg viewBox="0 0 120 120" class="w-full h-full object-contain" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rc" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#C8083B"/><stop offset="50%" stop-color="#E60A15"/><stop offset="100%" stop-color="#FF6B1A"/></linearGradient></defs><path d="M38 34 A30 30 0 1 0 82 34" stroke="url(#rc)" stroke-width="8.5" stroke-linecap="round" fill="none"/><path d="M60 15 L73 45 L66 64 H54 L47 45 Z" fill="url(#rc)"/><circle cx="60" cy="45" r="3.6" fill="#080808"/><rect x="52" y="67" width="16" height="6.5" rx="1.5" fill="url(#rc)"/><text x="60" y="102" text-anchor="middle" fill="#FFFFFF" font-family="Montserrat, sans-serif" font-size="14" font-weight="900" letter-spacing="2">RAY-ON</text></svg>';

    const imgOrFallback = (src, alt, cls) => src
      ? '<img src="' + esc(src) + '" alt="' + esc(alt) + '" class="' + cls + '" loading="lazy" />'
      : '<div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-crimson/35 via-[#180507] to-obsidian p-5 text-center"><span class="font-syne font-extrabold text-sm sm:text-base text-white">' + esc(alt) + '</span></div>';

    function renderProjectTile(p, sec) {
      const light = Boolean(p.lightBg && p.image);
      return '<article data-open-sec="' + sec + '" data-open-id="' + esc(p.id) + '" class="portfolio-tile relative aspect-square overflow-hidden ' + (light ? 'bg-white' : 'bg-obsidian') + ' border border-white/20 shadow-lg">' +
        '<div class="tile-art w-full h-full ' + (light ? 'p-5 flex items-center justify-center' : '') + '">' +
          imgOrFallback(p.image, p.client + ' — ' + p.title, light ? 'w-full h-full object-contain' : 'w-full h-full object-cover object-top') +
        '</div>' +
        '<div class="tile-overlay absolute inset-x-2.5 bottom-2.5 rounded-2xl bg-obsidian/90 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2">' +
          '<div class="min-w-0"><span class="block text-[10px] font-bold uppercase tracking-widest text-crimson">' + esc(p.category) + '</span>' +
          '<h3 class="font-montserrat text-xs sm:text-sm font-extrabold text-white truncate">' + esc(p.client) + '</h3>' +
          '<p class="text-[11px] text-zinc-300 truncate">' + esc(p.title) + '</p></div>' +
          '<span class="shrink-0 px-2.5 py-1.5 rounded-full bg-crimson text-[10px] font-bold text-white whitespace-nowrap">View →</span>' +
        '</div></article>';
    }

    function renderVideoReelsGrid(reels) {
      return reels.map((reel) => {
        const vUrl = reel.videoUrl ? normalizeCloudinaryVideoUrl(reel.videoUrl) : null;
        const poster = reel.posterUrl || (vUrl ? deriveCloudinaryVideoPoster(vUrl) : null);
        const light = Boolean(reel.lightBg && !vUrl && (reel.gifUrl || poster));
        let mediaHtml = '';
        if (vUrl) {
          mediaHtml = '<video data-reel-video src="' + esc(vUrl) + '"' + (poster ? ' poster="' + esc(poster) + '"' : '') + ' muted loop playsinline preload="metadata" class="w-full h-full object-cover"></video>';
        } else if (reel.gifUrl) {
          mediaHtml = '<img src="' + esc(reel.gifUrl) + '" alt="' + esc(reel.title) + '" class="' + (light ? 'w-full h-full object-contain' : 'w-full h-full object-cover') + '" />';
        } else if (poster) {
          mediaHtml = '<img src="' + esc(poster) + '" alt="' + esc(reel.title) + '" class="' + (light ? 'w-full h-full object-contain' : 'w-full h-full object-cover') + '" />';
        } else {
          mediaHtml = '<div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-crimson/30 via-[#150406] to-obsidian p-5 text-center"><span class="text-[10px] font-bold uppercase tracking-widest text-crimson mb-2">' + esc(reel.toolTag) + '</span><span class="font-syne text-base font-extrabold text-white">' + esc(reel.client) + '</span><span class="text-xs text-zinc-300 mt-1">' + esc(reel.title) + '</span></div>';
        }
        return '<article data-reel-card data-open-sec="videos" data-open-id="' + esc(reel.id) + '" class="portfolio-tile reel-tile relative aspect-[4/5] overflow-hidden border border-white/15 shadow-xl ' + (light ? 'bg-white' : 'bg-obsidian') + '">' +
          '<div class="tile-art relative w-full h-full ' + (light ? 'p-4 flex items-center justify-center' : '') + '">' + mediaHtml + '</div>' +
          '<div class="pointer-events-none absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">' +
            '<div class="relative">' +
              '<span class="reel-idle-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/20 text-[9.5px] font-montserrat font-bold tracking-wider uppercase text-white"><span class="w-2 h-2 rounded-full bg-crimson"></span>' + (vUrl ? 'VIDEO • HOVER TO PLAY' : 'REEL • CLICK TO VIEW') + '</span>' +
              '<span class="reel-playing-badge absolute top-0 left-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-crimson text-[9.5px] font-montserrat font-bold tracking-wider uppercase text-white shadow-lg whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>PLAYING</span>' +
            '</div>' +
            '<span class="px-2.5 py-1 rounded-full bg-obsidian/75 backdrop-blur-md border border-crimson/45 text-[9.5px] font-bold text-zinc-100 truncate max-w-[52%]">' + esc(reel.toolTag) + '</span>' +
          '</div>' +
          '<div class="tile-overlay absolute inset-x-2.5 bottom-2.5 rounded-2xl bg-obsidian/90 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2 z-10">' +
            '<div class="min-w-0"><span class="block text-[10px] font-bold uppercase tracking-widest text-crimson">' + esc(reel.category) + ' • ' + esc(reel.duration) + '</span>' +
            '<h3 class="font-montserrat text-xs sm:text-sm font-extrabold text-white truncate">' + esc(reel.client) + '</h3>' +
            '<p class="text-[11px] text-zinc-300 truncate">' + esc(reel.title) + '</p></div>' +
            '<span class="shrink-0 px-2.5 py-1.5 rounded-full bg-crimson text-[10px] font-bold text-white whitespace-nowrap">Expand →</span>' +
          '</div></article>';
      }).join('');
    }

    function renderAffiliationsFooter(CFG) {
      const list = CFG.affiliations || [];
      if (!list.length) return '';
      const repeat = list.length < 8 ? Math.ceil(8 / list.length) : 1;
      const track = [];
      for (let i = 0; i < repeat; i++) track.push(...list);
      const dur = Math.max(22, track.length * 3.8);
      const renderTile = (a) => {
        const bg = (a.logoUrl && a.lightLogoBg) ? 'bg-white border-white/85 hover:border-crimson' : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 hover:border-crimson/65';
        const inner = '<div title="' + esc(a.name) + '" class="h-16 sm:h-[74px] w-28 sm:w-36 rounded-2xl px-4 py-2.5 flex items-center justify-center border transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.42)] shrink-0 ' + bg + '">' +
          (a.logoUrl
            ? '<img src="' + esc(a.logoUrl) + '" alt="' + esc(a.name) + '" loading="lazy" class="max-w-full max-h-full object-contain" />'
            : '<span class="font-syne text-sm sm:text-base font-extrabold tracking-[0.16em] uppercase text-white/85">' + esc((a.name || 'ORG').split(/\s+/).slice(0,2).map((w) => w[0] || '').join('').toUpperCase()) + '</span>') +
          '</div>';
        if (a.websiteUrl && /^https?:\/\//i.test(a.websiteUrl.trim())) {
          return '<a href="' + esc(a.websiteUrl.trim()) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(a.name) + '">' + inner + '</a>';
        }
        return inner;
      };
      const row = '<div class="flex items-center gap-3.5 sm:gap-4 pr-3.5 sm:pr-4 shrink-0">' + track.map(renderTile).join('') + '</div>';
      return '<footer id="affiliations" class="relative bg-[#070304] border-t border-crimson/40 overflow-hidden py-7 sm:py-9">' +
        '<div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mb-5 flex items-center gap-2">' +
          '<span class="w-2 h-2 rounded-full bg-crimson shadow-[0_0_10px_#E60A15]"></span>' +
          '<h2 data-copy-key="affiliationsHeading" class="font-montserrat text-[11px] sm:text-xs font-extrabold tracking-[0.22em] uppercase text-crimson-white">' + esc(CFG.copy.affiliationsHeading || 'ORGANIZATIONS & AFFILIATIONS') + '</h2>' +
        '</div>' +
        '<div class="marquee-container marquee-mask relative z-10 w-full overflow-hidden py-1">' +
          '<div class="marquee-track" style="--marquee-duration:' + dur + 's">' + row + row + '</div>' +
        '</div></footer>';
    }

    function renderPortfolio() {
      const CFG = PORTFOLIO_CONFIG;
      document.title = CFG.copy.siteTitle || document.title;
      document.body.classList.toggle('edit-mode-active', editMode);
      const showAdminBtn = isAdminRevealed || Boolean(adminUser);
      const logoLight = Boolean(CFG.images.logoPrimary && CFG.imageLightBg && CFG.imageLightBg.logoPrimary);

      const idCats = ['All', ...Array.from(new Set(CFG.identityProjects.map((p) => p.category).filter(Boolean)))];
      if (!idCats.includes(activeIdentityCategory)) activeIdentityCategory = 'All';
      const filteredId = activeIdentityCategory === 'All' ? CFG.identityProjects : CFG.identityProjects.filter((p) => p.category === activeIdentityCategory);

      const vidCats = ['All', ...Array.from(new Set(CFG.videoReels.map((v) => v.category).filter(Boolean)))];
      if (!vidCats.includes(activeVideoCategory)) activeVideoCategory = 'All';
      const filteredVids = activeVideoCategory === 'All' ? CFG.videoReels : CFG.videoReels.filter((v) => v.category === activeVideoCategory);

      const qrSrc = CFG.images.qrCode || ('https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(CFG.profile.instagramUrl));

      document.getElementById('app').innerHTML =
        (editMode
          ? '<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-2xl rounded-2xl bg-obsidian/95 backdrop-blur-xl border-2 border-crimson px-4 py-3 shadow-[0_0_40px_rgba(230,10,21,0.5)] flex flex-wrap items-center justify-between gap-3">' +
              '<div class="text-xs"><strong class="text-white block">On-Page Text Editing is ON</strong><span class="text-zinc-300">Click any dashed text to rewrite it directly.</span></div>' +
              '<div class="flex items-center gap-2"><span data-cloud-status class="px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-semibold text-zinc-200">' + esc(cloudStatus) + '</span>' +
              '<button id="bannerSyncBtn" type="button" class="px-3 py-1.5 rounded-full bg-crimson text-[11px] font-bold text-white">Sync Now</button>' +
              '<button id="bannerDoneBtn" type="button" class="px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-semibold text-white">Done</button></div></div>'
          : '') +
        '<header class="sticky top-0 z-40 backdrop-blur-xl bg-obsidian/90 border-b border-white/10">' +
          '<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">' +
            '<a id="navLogoSlot" href="#top" class="flex items-center gap-2.5 group shrink-0">' +
              '<div class="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center ' + (logoLight ? 'bg-white p-1 border border-white/80' : 'bg-obsidian') + '">' +
                (CFG.images.logoPrimary ? '<img src="' + esc(CFG.images.logoPrimary) + '" alt="Ray-On Logo" class="w-full h-full object-contain ' + (logoLight ? '' : 'logo-blend-lighten') + '" />' : logoSvg) +
              '</div>' +
              '<div class="leading-tight"><span data-copy-key="navBrandName" class="block font-syne text-xs sm:text-sm font-extrabold tracking-[0.22em] text-white group-hover:text-crimson">' + esc(CFG.copy.navBrandName) + '</span>' +
              '<span data-copy-key="navBrandSub" class="block text-[9px] font-montserrat tracking-[0.16em] text-zinc-400 uppercase">' + esc(CFG.copy.navBrandSub) + '</span></div>' +
            '</a>' +
            '<nav class="hidden md:flex items-center gap-5 text-[11px] font-montserrat font-semibold tracking-widest uppercase text-zinc-300">' +
              '<a href="#about" class="hover:text-crimson">' + esc(CFG.copy.navAbout) + '</a>' +
              '<a href="#branding" class="hover:text-crimson">' + esc(CFG.copy.navBranding) + '</a>' +
              '<a href="#flyers" class="hover:text-crimson">' + esc(CFG.copy.navFlyers) + '</a>' +
              '<a href="#videos" class="hover:text-crimson">' + esc(CFG.copy.navVideos) + '</a>' +
              '<a href="#photography" class="hover:text-crimson">' + esc(CFG.copy.navPhotography) + '</a>' +
              '<a href="#reviews" class="hover:text-crimson">' + esc(CFG.copy.navReviews) + '</a>' +
            '</nav>' +
            '<div class="flex items-center gap-2 shrink-0">' +
              (showAdminBtn ? '<button id="openStudioDrawerBtn" type="button" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-crimson border border-white/15 text-[11px] font-montserrat font-bold text-white transition-colors">Edit Site</button>' : '') +
              '<a href="#contact" class="btn-crimson-pill px-4 py-2 rounded-full text-[11px] font-montserrat font-extrabold tracking-wider text-obsidian">' + esc(CFG.copy.heroCtaLabel) + '</a>' +
            '</div>' +
          '</div>' +
        '</header>' +
        '<main id="top" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">' +
          '<section class="text-center space-y-6">' +
            '<p data-copy-key="heroTopStrip" class="text-xs font-montserrat font-bold tracking-[0.2em] uppercase text-crimson">' + esc(CFG.copy.heroTopStrip) + '</p>' +
            '<div class="mx-auto morph-portrait morph-portrait-hero w-64 h-80 sm:w-80 sm:h-[400px] overflow-hidden border-2 border-crimson/55 bg-obsidian shadow-[0_0_54px_rgba(230,10,21,0.42)]">' +
              '<div class="morph-portrait-media hero-portrait-feather w-full h-full">' + imgOrFallback(CFG.images.heroPortrait, CFG.profile.name, 'w-full h-full object-cover object-top') + '</div>' +
            '</div>' +
            '<h1 data-copy-key="heroTitle" class="font-syne text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight">' + esc(CFG.copy.heroTitle) + '</h1>' +
            '<p data-copy-key="heroSubtitle" class="font-montserrat text-base sm:text-2xl font-bold text-crimson-white">' + esc(CFG.copy.heroSubtitle) + '</p>' +
          '</section>' +
          '<section id="about" class="space-y-6">' +
            '<div class="editorial-divider"></div>' +
            '<div class="card-crimson-blush rounded-[2rem] p-6 sm:p-9 grid md:grid-cols-12 gap-6 items-center">' +
              '<div class="md:col-span-7 space-y-3 text-white">' +
                '<h2 data-copy-key="aboutHeading" class="font-montserrat text-2xl sm:text-3xl font-extrabold uppercase">' + esc(CFG.copy.aboutHeading) + '</h2>' +
                '<p data-copy-key="aboutBio1" class="text-sm sm:text-base leading-relaxed">' + rich(CFG.copy.aboutBio1) + '</p>' +
                '<p data-copy-key="aboutBio2" class="text-xs sm:text-sm leading-relaxed">' + rich(CFG.copy.aboutBio2) + '</p>' +
                '<p data-copy-key="aboutBio3" class="text-xs sm:text-sm leading-relaxed">' + rich(CFG.copy.aboutBio3) + '</p>' +
              '</div>' +
              '<div class="md:col-span-5 flex justify-center">' +
                '<div class="morph-portrait morph-portrait-bento monochrome w-56 h-64 sm:w-64 sm:h-72 overflow-hidden bg-obsidian border-2 border-white/80"><div class="morph-portrait-media w-full h-full">' + imgOrFallback(CFG.images.aboutPortrait, CFG.profile.name, 'w-full h-full object-cover object-top') + '</div></div>' +
              '</div>' +
            '</div>' +
            '<div class="card-crimson-vibrant rounded-[2rem] p-6 sm:p-8 grid md:grid-cols-2 gap-6">' +
              '<div class="space-y-4">' +
                '<h3 data-copy-key="experienceHeading" class="font-montserrat text-xl font-extrabold uppercase">' + esc(CFG.copy.experienceHeading) + '</h3>' +
                '<div class="flex flex-wrap items-center gap-2.5">' +
                  '<div class="inline-block px-4 py-1.5 rounded-full border-2 border-white text-xs font-bold">' + esc(CFG.profile.experience) + '</div>' +
                  (CFG.cv && CFG.cv.fileUrl ? '<a href="' + esc(CFG.cv.fileUrl) + '" download="' + esc(CFG.cv.fileName || 'Raymond_Ajimuda_CV.pdf') + '" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-crimson text-xs font-extrabold shadow-md hover:scale-105 transition-transform">↓ ' + esc(CFG.cv.buttonLabel || 'Download CV') + '</a>' : '') +
                '</div>' +
                '<h3 data-copy-key="whatIDoHeading" class="font-montserrat text-lg font-extrabold uppercase pt-2">' + esc(CFG.copy.whatIDoHeading) + '</h3>' +
                '<div class="flex flex-wrap gap-2">' + CFG.services.map((s) => '<span class="px-3 py-1.5 rounded-full bg-obsidian/30 border border-white/40 text-[11px] font-semibold">' + esc(s) + '</span>').join('') + '</div>' +
              '</div>' +
              '<div class="space-y-4">' +
                '<h3 data-copy-key="toolsHeading" class="font-montserrat text-xl font-extrabold uppercase">' + esc(CFG.copy.toolsHeading) + '</h3>' +
                '<div class="grid grid-cols-4 gap-2.5">' + CFG.tools.map((t) => '<div class="tool-tile aspect-square flex flex-col items-center justify-center p-1.5 border-2 text-center" style="background:' + esc(t.bg) + ';border-color:' + esc(t.border) + '"><span class="font-bold text-sm" style="color:' + esc(t.color) + '">' + esc(t.badge) + '</span><span class="text-[8px] truncate max-w-full">' + esc(t.name.split(' ')[0]) + '</span></div>').join('') + '</div>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section id="branding" class="space-y-6">' +
            '<div class="editorial-divider"></div>' +
            '<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">' +
              '<div><h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span data-copy-key="brandingTitleAccent" class="text-crimson">' + esc(CFG.copy.brandingTitleAccent) + '</span> <span data-copy-key="brandingTitleRest">' + esc(CFG.copy.brandingTitleRest) + '</span></h2>' +
              '<p data-copy-key="brandingSubtitle" class="mt-2 text-xs sm:text-sm text-zinc-400">' + esc(CFG.copy.brandingSubtitle) + '</p></div>' +
              '<div class="flex flex-wrap gap-2">' + idCats.map((c) => '<button type="button" data-id-cat="' + esc(c) + '" class="px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase ' + (c === activeIdentityCategory ? 'bg-crimson text-white' : 'bg-white/10 text-zinc-300 hover:bg-white/20') + '">' + esc(c) + '</button>').join('') + '</div>' +
            '</div>' +
            '<div class="grid-frame-striped rounded-[2rem] p-4 sm:p-6"><div class="portfolio-grid-group relative z-10 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">' + filteredId.map((p) => renderProjectTile(p, 'identity')).join('') + '</div></div>' +
          '</section>' +
          '<section id="flyers" class="space-y-6">' +
            '<div class="editorial-divider"></div>' +
            '<div><h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span data-copy-key="flyersTitleAccent" class="text-crimson">' + esc(CFG.copy.flyersTitleAccent) + '</span> <span data-copy-key="flyersTitleRest">' + esc(CFG.copy.flyersTitleRest) + '</span></h2>' +
            '<p data-copy-key="flyersSubtitle" class="mt-2 text-xs sm:text-sm text-zinc-400">' + esc(CFG.copy.flyersSubtitle) + '</p></div>' +
            '<div class="grid-frame-striped rounded-[2rem] p-4 sm:p-6"><div class="portfolio-grid-group relative z-10 grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">' + CFG.flyerProjects.map((p) => renderProjectTile(p, 'flyers')).join('') + '</div></div>' +
          '</section>' +
          '<section id="videos" class="space-y-6">' +
            '<div class="editorial-divider"></div>' +
            '<div class="flex flex-col md:flex-row md:items-end justify-between gap-4">' +
              '<div><h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span data-copy-key="videosTitleAccent" class="text-crimson">' + esc(CFG.copy.videosTitleAccent) + '</span> <span data-copy-key="videosTitleRest">' + esc(CFG.copy.videosTitleRest) + '</span></h2>' +
              '<p data-copy-key="videosSubtitle" class="mt-2 text-xs sm:text-sm text-zinc-400">' + esc(CFG.copy.videosSubtitle) + '</p></div>' +
              '<div class="flex flex-wrap gap-2">' + vidCats.map((c) => '<button type="button" data-vid-cat="' + esc(c) + '" class="px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold uppercase ' + (c === activeVideoCategory ? 'bg-crimson text-white' : 'bg-white/10 text-zinc-300 hover:bg-white/20') + '">' + esc(c) + '</button>').join('') + '</div>' +
            '</div>' +
            '<div class="grid-frame-obsidian rounded-[2rem] p-4 sm:p-6 border border-crimson/35"><div id="videoReelsGrid" class="portfolio-grid-group grid sm:grid-cols-2 lg:grid-cols-3 gap-5">' + renderVideoReelsGrid(filteredVids) + '</div></div>' +
          '</section>' +
          '<section id="photography" class="space-y-6">' +
            '<div class="editorial-divider"></div>' +
            '<div><h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span data-copy-key="photoTitleAccent" class="text-crimson">' + esc(CFG.copy.photoTitleAccent) + '</span> <span data-copy-key="photoTitleRest">' + esc(CFG.copy.photoTitleRest) + '</span></h2>' +
            '<p data-copy-key="photoSubtitle" class="mt-2 text-xs sm:text-sm text-zinc-400">' + esc(CFG.copy.photoSubtitle) + '</p></div>' +
            '<div class="rounded-[2rem] bg-white/[0.04] border border-white/15 p-5 sm:p-7 grid lg:grid-cols-12 gap-6 items-center">' +
              '<div class="lg:col-span-6">' +
                '<div id="retouchSliderContainer" class="relative aspect-[4/5] w-full max-w-sm mx-auto rounded-2xl overflow-hidden border border-white/20 select-none touch-none cursor-ew-resize bg-obsidian">' +
                  '<div id="retouchBeforeLayer" class="absolute inset-0 retouch-raw-filter">' + imgOrFallback(CFG.images.retouchBefore || CFG.images.heroPortrait, 'Before Raw', 'w-full h-full object-cover object-top') + '</div>' +
                  '<div id="retouchAfterLayer" class="absolute inset-0 retouch-graded-filter" style="clip-path: inset(0 0 0 ' + retouchPercent + '%)">' + imgOrFallback(CFG.images.retouchAfter || CFG.images.heroPortrait, 'After Grade', 'w-full h-full object-cover object-top') + '</div>' +
                  '<div id="retouchDivider" class="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_14px_#E60A15]" style="left:' + retouchPercent + '%"><div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-crimson border-2 border-white flex items-center justify-center text-[11px] font-extrabold">↔</div></div>' +
                  '<span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-obsidian/80 text-[10px] font-bold uppercase">' + esc(CFG.copy.retouchBeforeLabel) + '</span>' +
                  '<span class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-crimson/90 text-[10px] font-bold uppercase">' + esc(CFG.copy.retouchAfterLabel) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="lg:col-span-6 space-y-3">' +
                '<span class="inline-block px-3 py-1 rounded-full bg-crimson/20 border border-crimson/45 text-[11px] font-bold uppercase tracking-wider text-crimson">' + esc(CFG.copy.retouchBadge) + '</span>' +
                '<h3 data-copy-key="retouchTitle" class="font-syne text-2xl sm:text-3xl font-extrabold text-white">' + esc(CFG.copy.retouchTitle) + '</h3>' +
                '<p data-copy-key="retouchDesc" class="text-sm text-zinc-300 leading-relaxed">' + rich(CFG.copy.retouchDesc) + '</p>' +
                '<input id="retouchRangeInput" type="range" min="0" max="100" value="' + retouchPercent + '" class="w-full accent-crimson mt-2" />' +
              '</div>' +
            '</div>' +
            '<div class="portfolio-grid-group grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">' + CFG.photoProjects.map((p) => renderProjectTile(p, 'photos')).join('') + '</div>' +
          '</section>' +
          '<section id="reviews" class="space-y-6">' +
            '<div class="editorial-divider"></div>' +
            '<div><h2 class="font-syne text-3xl sm:text-5xl font-extrabold"><span data-copy-key="reviewsTitleAccent" class="text-crimson">' + esc(CFG.copy.reviewsTitleAccent) + '</span> <span data-copy-key="reviewsTitleRest">' + esc(CFG.copy.reviewsTitleRest) + '</span></h2>' +
            '<p data-copy-key="reviewsSubtitle" class="mt-2 text-xs sm:text-sm text-zinc-400">' + esc(CFG.copy.reviewsSubtitle) + '</p></div>' +
            '<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">' + CFG.testimonials.map((t) => '<div class="rounded-3xl bg-white/[0.04] border border-white/10 p-6 flex flex-col justify-between gap-4"><div><div class="text-amber-400 text-sm mb-3">' + '★'.repeat(Math.max(1, Math.min(5, t.rating || 5))) + '</div><p class="text-sm text-zinc-200 leading-relaxed">' + esc(t.quote) + '</p></div><div class="pt-3 border-t border-white/10"><p class="font-bold text-sm">' + esc(t.brand) + '</p><p class="text-xs text-zinc-400">' + esc(t.author) + ' • ' + esc(t.sector) + '</p></div></div>').join('') + '</div>' +
          '</section>' +
        '</main>' +
        '<section id="contact" class="bg-diagonal-crimson border-t border-crimson/40 py-14 px-4 sm:px-6 mt-12">' +
          '<div class="max-w-5xl mx-auto grid lg:grid-cols-12 gap-8 items-start">' +
            '<div class="lg:col-span-6 space-y-5">' +
              '<h2 data-copy-key="closingThankYou" class="font-caveat text-7xl sm:text-8xl font-bold text-brush-gradient leading-[1.04] inline-block px-2 pr-10 py-2 -rotate-2 overflow-visible">' + esc(CFG.copy.closingThankYou).replace(/\n/g, '<br/>') + '</h2>' +
              '<p data-copy-key="closingSummary" class="text-sm text-zinc-200 leading-relaxed">' + rich(CFG.copy.closingSummary) + '</p>' +
              '<div class="flex flex-wrap gap-3">' +
                '<a href="' + esc(CFG.profile.whatsappUrl) + '" target="_blank" rel="noopener noreferrer" class="btn-crimson-pill px-5 py-2.5 rounded-full text-xs font-extrabold text-obsidian">' + esc(CFG.copy.closingWhatsappCta) + '</a>' +
                '<a href="mailto:' + esc(CFG.profile.email) + '" class="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold">' + esc(CFG.copy.closingEmailCta) + '</a>' +
                (CFG.cv && CFG.cv.fileUrl ? '<a href="' + esc(CFG.cv.fileUrl) + '" download="' + esc(CFG.cv.fileName || 'Raymond_Ajimuda_CV.pdf') + '" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-bold text-white">↓ ' + esc(CFG.cv.buttonLabel || 'Download CV') + '</a>' : '') +
                '<button id="copyPhoneBtn" type="button" class="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold">' + esc(CFG.profile.whatsappDisplay) + '</button>' +
              '</div>' +
              '<div class="flex items-center gap-4 pt-2">' +
                '<div class="w-28 rounded-2xl bg-gradient-to-br from-crimson via-[#ff6872] to-white p-2.5 text-center shrink-0"><div class="w-full aspect-square rounded-xl bg-white p-1.5"><img src="' + esc(qrSrc) + '" alt="QR" class="w-full h-full object-contain"/></div></div>' +
                '<div><a href="' + esc(CFG.profile.instagramUrl) + '" target="_blank" rel="noopener noreferrer" class="text-sm font-bold text-white hover:text-crimson">' + esc(CFG.profile.instagramHandle) + '</a><p class="text-xs text-zinc-300 mt-1">' + esc(CFG.copy.qrCaption) + '</p><p data-copy-key="copyrightText" class="text-[11px] text-zinc-400 mt-2">' + esc(CFG.copy.copyrightText) + '</p></div>' +
              '</div>' +
            '</div>' +
            '<form id="inquiryForm" class="lg:col-span-6 rounded-[1.75rem] bg-obsidian/75 backdrop-blur-md border border-white/15 p-5 sm:p-6 space-y-3.5 shadow-2xl">' +
              '<div><h3 class="font-syne text-xl font-extrabold text-white">' + esc(CFG.copy.bookingHeading) + '</h3><p class="text-xs text-zinc-400 mt-1">' + esc(CFG.copy.bookingSubheading) + '</p></div>' +
              '<div class="grid sm:grid-cols-2 gap-3">' +
                '<input id="inqName" type="text" required placeholder="Your Name *" class="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson" />' +
                '<input id="inqBrand" type="text" placeholder="Brand / Company" class="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson" />' +
              '</div>' +
              '<div class="grid sm:grid-cols-2 gap-3">' +
                '<select id="inqService" class="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson">' + CFG.services.map((s) => '<option value="' + esc(s) + '">' + esc(s) + '</option>').join('') + '</select>' +
                '<select id="inqTimeline" class="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson"><option>ASAP (1–2 Weeks)</option><option>This Month</option><option>Flexible / Retainer</option></select>' +
              '</div>' +
              '<textarea id="inqBrief" rows="3" required placeholder="Tell me about your project goals *" class="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson"></textarea>' +
              '<div class="flex flex-wrap gap-2.5">' +
                '<button type="submit" class="flex-1 btn-crimson-pill px-4 py-2.5 rounded-full text-xs font-montserrat font-extrabold text-obsidian">Send via WhatsApp</button>' +
                '<button id="inqEmailBtn" type="button" class="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white">Send via Email</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</section>' +
        renderAffiliationsFooter(CFG);

      bindPageEvents();
    }

    function bindPageEvents() {
      // 5-tap secret unlock on #navLogoSlot within 3 seconds
      const navLogo = document.getElementById('navLogoSlot');
      if (navLogo) {
        navLogo.onclick = (e) => {
          const now = Date.now();
          logoTapTimestamps = logoTapTimestamps.filter((t) => now - t <= 3000);
          logoTapTimestamps.push(now);
          if (logoTapTimestamps.length > 1) e.preventDefault();
          if (logoTapTimestamps.length >= 5) {
            logoTapTimestamps = [];
            isAdminRevealed = true;
            showToast('Edit Site unlocked');
            renderPortfolio();
          }
        };
      }

      const openBtn = document.getElementById('openStudioDrawerBtn');
      if (openBtn) {
        openBtn.onclick = () => {
          if (adminUser) { drawerOpen = true; renderStudioDrawer(); }
          else { renderLoginModal(); }
        };
      }

      const bSync = document.getElementById('bannerSyncBtn');
      if (bSync) bSync.onclick = () => saveConfigToCloud(true);
      const bDone = document.getElementById('bannerDoneBtn');
      if (bDone) bDone.onclick = () => { editMode = false; renderPortfolio(); };

      // Category filter buttons
      document.querySelectorAll('[data-id-cat]').forEach((btn) => {
        btn.onclick = () => { activeIdentityCategory = btn.getAttribute('data-id-cat'); renderPortfolio(); };
      });
      document.querySelectorAll('[data-vid-cat]').forEach((btn) => {
        btn.onclick = () => { activeVideoCategory = btn.getAttribute('data-vid-cat'); renderPortfolio(); };
      });

      // Video hover/tap smooth playback (keeps poster intact until played)
      document.querySelectorAll('[data-reel-card]').forEach((card) => {
        const videoEl = card.querySelector('[data-reel-video]');
        if (!videoEl) return;
        let hasPlayed = false;
        card.addEventListener('pointerenter', (e) => {
          if (e.pointerType === 'touch') return;
          card.classList.add('is-playing');
          hasPlayed = true;
          videoEl.play().catch(() => {});
        });
        card.addEventListener('pointerleave', (e) => {
          if (e.pointerType === 'touch') return;
          card.classList.remove('is-playing');
          if (hasPlayed) {
            videoEl.pause();
            try { if (videoEl.readyState >= 1) videoEl.currentTime = 0; } catch {}
          }
        });
      });

      // Tile click -> Lightbox
      document.querySelectorAll('[data-open-sec]').forEach((tile) => {
        tile.addEventListener('click', () => {
          lightboxState = { sec: tile.getAttribute('data-open-sec'), id: tile.getAttribute('data-open-id') };
          renderLightbox();
        });
      });

      // Retouch Before/After slider
      const sliderBox = document.getElementById('retouchSliderContainer');
      const rangeInput = document.getElementById('retouchRangeInput');
      const applyRetouch = (pct) => {
        retouchPercent = Math.max(0, Math.min(100, Math.round(pct)));
        const after = document.getElementById('retouchAfterLayer');
        const div = document.getElementById('retouchDivider');
        if (after) after.style.clipPath = 'inset(0 0 0 ' + retouchPercent + '%)';
        if (div) div.style.left = retouchPercent + '%';
        if (rangeInput) rangeInput.value = String(retouchPercent);
      };
      if (rangeInput) rangeInput.oninput = (e) => applyRetouch(Number(e.target.value));
      if (sliderBox) {
        let dragging = false;
        const move = (clientX) => {
          const rect = sliderBox.getBoundingClientRect();
          applyRetouch(((clientX - rect.left) / rect.width) * 100);
        };
        sliderBox.onpointerdown = (e) => { dragging = true; sliderBox.setPointerCapture(e.pointerId); move(e.clientX); };
        sliderBox.onpointermove = (e) => { if (dragging) move(e.clientX); };
        sliderBox.onpointerup = () => { dragging = false; };
      }

      // Copy phone
      const copyBtn = document.getElementById('copyPhoneBtn');
      if (copyBtn) {
        copyBtn.onclick = async () => {
          try { await navigator.clipboard.writeText(PORTFOLIO_CONFIG.profile.whatsappDisplay); showToast('Copied ' + PORTFOLIO_CONFIG.profile.whatsappDisplay); }
          catch { showToast('Phone: ' + PORTFOLIO_CONFIG.profile.whatsappDisplay); }
        };
      }

      // Inquiry Form
      const buildBrief = () => {
        const name = (document.getElementById('inqName')?.value || '').trim();
        const brand = (document.getElementById('inqBrand')?.value || '').trim();
        const service = document.getElementById('inqService')?.value || 'Creative Direction';
        const timeline = document.getElementById('inqTimeline')?.value || 'ASAP';
        const brief = (document.getElementById('inqBrief')?.value || '').trim();
        if (!name || !brief) { showToast('Please enter your name and project brief.'); return null; }
        return 'Hello ' + PORTFOLIO_CONFIG.profile.name + '! I would love to start a project.\n\nName: ' + name + '\nBrand: ' + (brand || 'N/A') + '\nService: ' + service + '\nTimeline: ' + timeline + '\n\nBrief:\n' + brief;
      };
      const form = document.getElementById('inquiryForm');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const txt = buildBrief();
          if (!txt) return;
          const a = document.createElement('a');
          a.href = PORTFOLIO_CONFIG.profile.whatsappUrl + '?text=' + encodeURIComponent(txt);
          a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.click();
        };
      }
      const inqEmail = document.getElementById('inqEmailBtn');
      if (inqEmail) {
        inqEmail.onclick = () => {
          const txt = buildBrief();
          if (!txt) return;
          const subj = encodeURIComponent('Project Inquiry — ' + (document.getElementById('inqService')?.value || 'Portfolio'));
          window.location.href = 'mailto:' + PORTFOLIO_CONFIG.profile.email + '?subject=' + subj + '&body=' + encodeURIComponent(txt);
        };
      }

      // On-page Click-to-Edit copy
      if (editMode) {
        document.querySelectorAll('[data-copy-key]').forEach((el) => {
          el.setAttribute('contenteditable', 'true');
          el.onblur = () => {
            const key = el.getAttribute('data-copy-key');
            PORTFOLIO_CONFIG.copy[key] = el.innerText.trim();
            scheduleCloudSave(false);
          };
        });
      }
    }

    function renderLightbox() {
      const root = document.getElementById('lightboxRoot');
      if (!lightboxState) { root.innerHTML = ''; return; }
      const list = lightboxState.sec === 'identity' ? PORTFOLIO_CONFIG.identityProjects
        : lightboxState.sec === 'flyers' ? PORTFOLIO_CONFIG.flyerProjects
        : lightboxState.sec === 'videos' ? PORTFOLIO_CONFIG.videoReels
        : PORTFOLIO_CONFIG.photoProjects;
      const idx = list.findIndex((x) => x.id === lightboxState.id);
      if (idx < 0) { root.innerHTML = ''; return; }
      const item = list[idx];
      const isVid = lightboxState.sec === 'videos';
      const vUrl = isVid && item.videoUrl ? normalizeCloudinaryVideoUrl(item.videoUrl) : null;
      const poster = isVid ? (item.posterUrl || (vUrl ? deriveCloudinaryVideoPoster(vUrl) : null)) : null;
      const light = Boolean(item.lightBg && (item.image || (!vUrl && item.gifUrl)));
      let media = '';
      if (vUrl) {
        media = '<video src="' + esc(vUrl) + '"' + (poster ? ' poster="' + esc(poster) + '"' : '') + ' controls autoplay loop playsinline preload="metadata" class="w-full h-full object-cover"></video>';
      } else if (isVid && item.gifUrl) {
        media = '<img src="' + esc(item.gifUrl) + '" alt="' + esc(item.title) + '" class="' + (light ? 'w-full h-full object-contain' : 'w-full h-full object-cover') + '" />';
      } else {
        media = imgOrFallback(item.image || poster, item.client + ' — ' + item.title, light ? 'w-full h-full object-contain' : 'w-full h-full object-cover object-top');
      }
      root.innerHTML =
        '<div id="lbBackdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/88 backdrop-blur-md">' +
          '<div id="lbCard" class="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-[#120607] border border-crimson/55 shadow-[0_0_68px_rgba(230,10,21,0.42)] grid md:grid-cols-12">' +
            '<button id="lbClose" type="button" class="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-obsidian/85 hover:bg-crimson text-white border border-white/15">✕</button>' +
            '<div class="md:col-span-6 bg-obsidian p-5 flex items-center justify-center"><div class="w-full aspect-square rounded-2xl overflow-hidden border border-white/10 ' + (light ? 'bg-white p-4 flex items-center justify-center' : 'bg-obsidian') + '">' + media + '</div></div>' +
            '<div class="md:col-span-6 p-6 flex flex-col justify-between gap-4">' +
              '<div><span class="px-3 py-1 rounded-full bg-crimson/20 border border-crimson/50 text-[11px] font-bold uppercase text-crimson">' + esc(item.category) + '</span>' +
              '<h3 class="mt-3 font-syne text-2xl font-extrabold text-white">' + esc(item.client) + '</h3>' +
              '<p class="text-sm font-semibold text-crimson mt-0.5">' + esc(item.title) + '</p>' +
              '<p class="mt-3 text-sm text-zinc-300 leading-relaxed">' + esc(item.summary) + '</p></div>' +
              '<div class="pt-4 border-t border-white/10 flex items-center justify-between">' +
                '<button id="lbPrev" type="button" class="px-4 py-2 rounded-full bg-white/10 hover:bg-crimson text-xs font-semibold">← Prev</button>' +
                '<span class="text-xs text-zinc-400">' + (idx + 1) + ' / ' + list.length + '</span>' +
                '<button id="lbNext" type="button" class="px-4 py-2 rounded-full bg-white/10 hover:bg-crimson text-xs font-semibold">Next →</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.getElementById('lbBackdrop').onclick = (e) => { if (e.target.id === 'lbBackdrop') { lightboxState = null; renderLightbox(); } };
      document.getElementById('lbClose').onclick = () => { lightboxState = null; renderLightbox(); };
      document.getElementById('lbPrev').onclick = () => { lightboxState.id = list[(idx - 1 + list.length) % list.length].id; renderLightbox(); };
      document.getElementById('lbNext').onclick = () => { lightboxState.id = list[(idx + 1) % list.length].id; renderLightbox(); };
    }

    function renderLoginModal() {
      const root = document.getElementById('loginModalRoot');
      root.innerHTML =
        '<div id="loginBg" class="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">' +
          '<form id="adminLoginForm" class="w-full max-w-md rounded-3xl bg-[#120607] border border-crimson/50 p-6 space-y-4 shadow-2xl">' +
            '<div class="flex items-center justify-between"><h3 class="font-syne text-xl font-extrabold text-white">Admin Studio Sign In</h3><button id="closeLoginBtn" type="button" class="w-8 h-8 rounded-full bg-white/10 hover:bg-crimson text-white">✕</button></div>' +
            '<p class="text-xs text-zinc-400">Sign in with your Firebase Admin Email & Password to edit and publish changes live.</p>' +
            '<input id="adminEmail" type="email" required placeholder="Admin Email" class="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-crimson" />' +
            '<input id="adminPass" type="password" required placeholder="Password" class="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-crimson" />' +
            '<p id="loginErr" class="hidden text-xs text-red-300 bg-red-950/70 border border-red-500/40 rounded-xl p-2.5"></p>' +
            '<button type="submit" class="w-full btn-crimson-pill py-2.5 rounded-full text-xs font-montserrat font-extrabold text-obsidian">Sign In to Edit Site</button>' +
          '</form>' +
        '</div>';
      document.getElementById('closeLoginBtn').onclick = () => { root.innerHTML = ''; };
      document.getElementById('loginBg').onclick = (e) => { if (e.target.id === 'loginBg') root.innerHTML = ''; };
      document.getElementById('adminLoginForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value.trim();
        const pass = document.getElementById('adminPass').value;
        const errEl = document.getElementById('loginErr');
        errEl.classList.add('hidden');
        try {
          await signInWithEmailAndPassword(auth, email, pass);
          root.innerHTML = '';
          drawerOpen = true;
          renderStudioDrawer();
          showToast('Signed in to Admin Studio!');
        } catch (err) {
          errEl.textContent = (err && err.message) || 'Invalid credentials.';
          errEl.classList.remove('hidden');
        }
      };
    }

    function getMediaSlots() {
      const CFG = PORTFOLIO_CONFIG;
      const slots = [
        { v: 'image:heroPortrait', l: 'Portrait — Hero Main Studio Portrait' },
        { v: 'image:aboutPortrait', l: 'Portrait — About Me Cutout' },
        { v: 'image:logoPrimary', l: 'Logo — Ray-On Primary Logo' },
        { v: 'image:qrCode', l: 'QR Code — Custom Instagram/Contact QR' },
        { v: 'image:retouchBefore', l: 'Retouch Slider — Before (Raw Photo)' },
        { v: 'image:retouchAfter', l: 'Retouch Slider — After (Graded Photo)' },
        { v: 'cv:fileUrl', l: 'CV / Résumé — PDF or Document Link' },
      ];
      CFG.identityProjects.forEach((p) => slots.push({ v: 'identity:' + p.id, l: 'Brand Tile — ' + p.client + ': ' + p.title }));
      CFG.flyerProjects.forEach((p) => slots.push({ v: 'flyers:' + p.id, l: 'Flyer Tile — ' + p.client + ': ' + p.title }));
      CFG.videoReels.forEach((v) => {
        slots.push({ v: 'video:' + v.id, l: 'Video Reel (MP4/MOV/WEBM/GIF) — ' + v.client + ': ' + v.title });
        slots.push({ v: 'videoPoster:' + v.id, l: 'Video Reel Poster — ' + v.client + ': ' + v.title });
      });
      CFG.photoProjects.forEach((p) => slots.push({ v: 'photos:' + p.id, l: 'Photo Gallery — ' + p.client + ': ' + p.title }));
      (CFG.affiliations || []).forEach((a) => slots.push({ v: 'affiliation:' + a.id, l: 'Footer Org Logo — ' + a.name }));
      return slots;
    }

    function assignUrlToSlot(slotStr, url, opts = {}) {
      const [group, id] = slotStr.split(':');
      const CFG = PORTFOLIO_CONFIG;
      if (group === 'image') {
        CFG.images[id] = url;
      } else if (group === 'cv') {
        CFG.cv = {
          fileUrl: url,
          fileName: opts.fileName || decodeURIComponent(url.split('?')[0].split('/').pop() || 'Raymond_Ajimuda_CV.pdf'),
          buttonLabel: (CFG.cv && CFG.cv.buttonLabel) || 'Download CV',
        };
      } else if (group === 'identity') {
        const it = CFG.identityProjects.find((x) => x.id === id); if (it) it.image = url;
      } else if (group === 'flyers') {
        const it = CFG.flyerProjects.find((x) => x.id === id); if (it) it.image = url;
      } else if (group === 'photos') {
        const it = CFG.photoProjects.find((x) => x.id === id); if (it) it.image = url;
      } else if (group === 'video') {
        const reel = CFG.videoReels.find((x) => x.id === id);
        if (reel) {
          if (opts.isVideo || isVideoUrl(url)) {
            reel.videoUrl = normalizeCloudinaryVideoUrl(url);
            reel.gifUrl = null;
            reel.posterUrl = opts.posterUrl || deriveCloudinaryVideoPoster(url) || reel.posterUrl;
          } else {
            reel.gifUrl = url;
            reel.videoUrl = null;
          }
        }
      } else if (group === 'videoPoster') {
        const reel = CFG.videoReels.find((x) => x.id === id); if (reel) reel.posterUrl = url;
      } else if (group === 'affiliation') {
        const aff = (CFG.affiliations || []).find((x) => x.id === id); if (aff) aff.logoUrl = url;
      }
      renderPortfolio();
      scheduleCloudSave(true);
    }

    function renderStudioDrawer() {
      const root = document.getElementById('studioDrawerRoot');
      if (!drawerOpen || !adminUser) { root.innerHTML = ''; return; }
      const CFG = PORTFOLIO_CONFIG;
      const slots = getMediaSlots();
      let tabHtml = '';

      if (activeTab === 'copy') {
        const fields = [
          ['profile', 'name', 'Full Name'], ['profile', 'agency', 'Agency Name'], ['profile', 'experience', 'Experience Badge'],
          ['profile', 'whatsappDisplay', 'WhatsApp Display'], ['profile', 'whatsappUrl', 'WhatsApp URL'], ['profile', 'email', 'Email'],
          ['profile', 'instagramHandle', 'Instagram Handle'], ['profile', 'instagramUrl', 'Instagram URL'],
          ['copy', 'siteTitle', 'SEO / Tab Title'], ['copy', 'heroTitle', 'Hero Headline'], ['copy', 'heroSubtitle', 'Hero Subtitle'],
          ['copy', 'aboutBio1', 'About Bio 1'], ['copy', 'aboutBio2', 'About Bio 2'], ['copy', 'aboutBio3', 'About Bio 3'],
          ['copy', 'closingThankYou', 'Closing Heading'], ['copy', 'closingSummary', 'Closing Summary'], ['copy', 'affiliationsHeading', 'Footer Organizations Heading']
        ];
        tabHtml =
          '<button id="toggleInlineEditBtn" type="button" class="w-full py-2.5 px-4 rounded-xl border text-xs font-bold ' + (editMode ? 'bg-crimson border-crimson text-white' : 'bg-white/5 border-white/15 text-zinc-200') + '">' +
            (editMode ? 'On-Page Click-to-Edit: ON (Click to Turn Off)' : 'Enable Click-to-Edit Text Directly on Page') +
          '</button>' +
          '<div class="space-y-3 mt-4">' +
            fields.map(([sec, key, label]) =>
              '<div><label class="block text-[11px] font-semibold text-zinc-300 mb-1">' + esc(label) + '</label>' +
              '<textarea data-edit-sec="' + sec + '" data-edit-key="' + key + '" rows="' + (key.startsWith('about') || key === 'closingSummary' ? 3 : 1) + '" class="w-full rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson">' + esc(CFG[sec][key] || '') + '</textarea></div>'
            ).join('') +
          '</div>';
      } else if (activeTab === 'media') {
        const affList = CFG.affiliations || [];
        tabHtml =
          '<div class="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-4">' +
            '<h4 class="text-xs font-montserrat font-extrabold uppercase tracking-wider text-crimson">Swap Photos, Logos, PDF & Video Reels (Cloudinary)</h4>' +
            '<div><label class="block text-[11px] font-bold uppercase text-zinc-300 mb-1.5">1. Select Slot</label>' +
              '<select id="swapTargetSelect" class="w-full rounded-xl bg-obsidian border border-white/15 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-crimson">' +
                slots.map((s) => '<option value="' + esc(s.v) + '"' + (s.v === selectedMediaSlot ? ' selected' : '') + '>' + esc(s.l) + '</option>').join('') +
              '</select></div>' +
            '<div><label class="block text-[11px] font-bold uppercase text-zinc-300 mb-1.5">2. Drag & Drop or Pick File</label>' +
              '<label id="swapDropzone" for="swapFileInput" class="flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-crimson/55 bg-crimson/5 hover:bg-crimson/10 cursor-pointer px-4 text-center">' +
                '<span id="swapUploadText" class="text-xs font-semibold text-white">Drop PNG, JPG, GIF, MP4, MOV, WEBM or PDF here</span>' +
                '<span id="swapUploadSub" class="text-[11px] text-zinc-400 mt-1">Raw file uploads straight to Cloudinary (up to 100 MB video)</span>' +
                '<input id="swapFileInput" type="file" accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.avi,.mkv,application/pdf,.pdf" class="hidden" />' +
              '</label></div>' +
            '<div class="pt-3 border-t border-white/10 space-y-2">' +
              '<label for="directCloudUrlInput" class="block text-[11px] font-bold uppercase text-zinc-300">3. Or Paste Direct Cloud URL</label>' +
              '<div class="flex gap-2">' +
                '<input id="directCloudUrlInput" type="url" placeholder="https://res.cloudinary.com/urwej0rr/..." class="flex-1 rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson" />' +
                '<button id="saveDirectUrlBtn" type="button" class="px-3.5 py-2 rounded-xl bg-crimson hover:bg-red-600 text-xs font-bold text-white whitespace-nowrap">Save URL to Slot</button>' +
              '</div>' +
              '<p id="swapErrBox" class="hidden text-xs text-red-200 bg-red-950/80 border border-red-500/40 rounded-xl p-2.5"></p>' +
            '</div>' +
          '</div>' +
          '<div class="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3 mt-4">' +
            '<div class="flex items-center justify-between"><h4 class="text-xs font-montserrat font-extrabold uppercase tracking-wider text-crimson">Footer Organization Logos</h4>' +
            '<button id="addOrgBtn" type="button" class="px-3 py-1.5 rounded-full bg-crimson text-[11px] font-bold text-white">+ Add Logo</button></div>' +
            '<div class="space-y-2.5">' +
              affList.map((a, idx) =>
                '<div class="rounded-xl bg-obsidian/70 border border-white/10 p-3 space-y-2">' +
                  '<div class="flex items-center justify-between gap-2"><input data-aff-name="' + idx + '" value="' + esc(a.name) + '" class="flex-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white" />' +
                  '<button data-aff-del="' + idx + '" type="button" class="px-2.5 py-1 rounded-lg bg-red-950 text-xs font-bold text-white">✕</button></div>' +
                  '<div class="flex items-center justify-between gap-2 text-[11px]">' +
                    '<label class="flex items-center gap-1.5 text-zinc-300 cursor-pointer"><input data-aff-light="' + idx + '" type="checkbox"' + (a.lightLogoBg ? ' checked' : '') + ' class="accent-crimson" /> White backdrop (dark logo)</label>' +
                    '<label class="px-2.5 py-1 rounded-lg bg-crimson/20 border border-crimson/50 text-white font-bold cursor-pointer">Upload Logo<input data-aff-file="' + idx + '" type="file" accept="image/*" class="hidden" /></label>' +
                  '</div>' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>';
      } else if (activeTab === 'publish') {
        tabHtml =
          '<div class="rounded-2xl bg-gradient-to-br from-crimson/20 to-obsidian border border-crimson/45 p-5 space-y-3">' +
            '<h4 class="font-syne text-lg font-extrabold text-white">Live Cloud Sync (Firestore)</h4>' +
            '<p class="text-xs text-zinc-300">Status: <strong data-cloud-status class="text-white">' + esc(cloudStatus) + '</strong></p>' +
            '<div class="flex flex-wrap gap-2">' +
              '<button id="publishSyncBtn" type="button" class="flex-1 btn-crimson-pill py-2.5 px-4 rounded-full text-xs font-montserrat font-extrabold text-obsidian">SYNC TO CLOUD NOW</button>' +
              '<button id="exportJsonBtn" type="button" class="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white">Export JSON</button>' +
            '</div>' +
          '</div>';
      }

      root.innerHTML =
        '<div id="studioBackdrop" class="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex justify-end">' +
          '<aside class="w-full max-w-lg h-full bg-[#0E0708] border-l border-crimson/40 flex flex-col shadow-2xl">' +
            '<div class="p-4 border-b border-white/10 flex items-center justify-between gap-2">' +
              '<div><h3 class="font-syne text-base font-extrabold text-white">Ray-On Edit Site Studio</h3><p class="text-[11px] text-zinc-400">' + esc(adminUser.email || 'Admin') + '</p></div>' +
              '<div class="flex items-center gap-2"><button id="signOutAdminBtn" type="button" class="px-3 py-1.5 rounded-full bg-white/10 hover:bg-crimson text-[11px] font-bold text-white">Sign Out</button>' +
              '<button id="closeStudioBtn" type="button" class="w-8 h-8 rounded-full bg-white/10 hover:bg-crimson text-white">✕</button></div>' +
            '</div>' +
            '<div class="px-4 pt-3 pb-2 border-b border-white/10 flex gap-2 text-xs font-bold">' +
              [['copy', '1. Text & Links'], ['media', '2. Swap Media & Logos'], ['publish', '3. Save & Sync']].map(([t, l]) =>
                '<button data-studio-tab="' + t + '" type="button" class="px-3 py-1.5 rounded-full ' + (activeTab === t ? 'bg-crimson text-white' : 'bg-white/10 text-zinc-300') + '">' + l + '</button>'
              ).join('') +
            '</div>' +
            '<div class="flex-1 overflow-y-auto p-4">' + tabHtml + '</div>' +
            '<div class="p-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-300 bg-obsidian/70">' +
              '<span data-cloud-status class="truncate">' + esc(cloudStatus) + '</span>' +
              '<button id="footerSaveBtn" type="button" class="px-4 py-1.5 rounded-full bg-crimson font-bold text-white">Save</button>' +
            '</div>' +
          '</aside>' +
        '</div>';

      document.getElementById('studioBackdrop').onclick = (e) => { if (e.target.id === 'studioBackdrop') { drawerOpen = false; renderStudioDrawer(); } };
      document.getElementById('closeStudioBtn').onclick = () => { drawerOpen = false; renderStudioDrawer(); };
      document.getElementById('footerSaveBtn').onclick = () => saveConfigToCloud(true);
      document.getElementById('signOutAdminBtn').onclick = async () => {
        await signOut(auth);
        drawerOpen = false;
        editMode = false;
        isAdminRevealed = window.location.search.includes('admin=true');
        renderStudioDrawer();
        renderPortfolio();
        showToast('Signed out of Admin Studio');
      };
      document.querySelectorAll('[data-studio-tab]').forEach((b) => {
        b.onclick = () => { activeTab = b.getAttribute('data-studio-tab'); renderStudioDrawer(); };
      });

      const toggleInline = document.getElementById('toggleInlineEditBtn');
      if (toggleInline) toggleInline.onclick = () => { editMode = !editMode; renderPortfolio(); renderStudioDrawer(); };

      document.querySelectorAll('[data-edit-sec]').forEach((inp) => {
        inp.oninput = () => {
          PORTFOLIO_CONFIG[inp.getAttribute('data-edit-sec')][inp.getAttribute('data-edit-key')] = inp.value;
          renderPortfolio();
          scheduleCloudSave(false);
        };
      });

      const slotSelect = document.getElementById('swapTargetSelect');
      if (slotSelect) slotSelect.onchange = (e) => { selectedMediaSlot = e.target.value; };

      const handleMediaFile = async (file) => {
        const errBox = document.getElementById('swapErrBox');
        const txt = document.getElementById('swapUploadText');
        const sub = document.getElementById('swapUploadSub');
        if (errBox) errBox.classList.add('hidden');
        const isVid = isVideoFile(file);
        const [group] = selectedMediaSlot.split(':');
        if (isVid && group !== 'video') {
          const msg = 'Switch Step 1 to a Video Reel slot before uploading a video file.';
          if (errBox) { errBox.textContent = msg; errBox.classList.remove('hidden'); }
          showToast(msg);
          return;
        }
        try {
          if (txt) txt.textContent = 'Uploading to Cloudinary... 0%';
          if (sub) sub.textContent = file.name;
          const res = await uploadToCloudinary(file, (pct) => { if (txt) txt.textContent = 'Uploading to Cloudinary... ' + pct + '%'; });
          assignUrlToSlot(selectedMediaSlot, res.secureUrl, { isVideo: res.isVideo, posterUrl: res.posterUrl, fileName: file.name });
          showToast(res.isVideo ? 'Video uploaded with H.264 stream & auto .jpg poster!' : 'Uploaded permanently to Cloudinary!');
          renderStudioDrawer();
        } catch (err) {
          const msg = (err && err.message) || 'Cloudinary upload failed.';
          if (errBox) { errBox.textContent = msg; errBox.classList.remove('hidden'); }
          if (txt) txt.textContent = 'Upload failed — try again';
          showToast('Upload error: ' + msg);
        }
      };

      const swapInput = document.getElementById('swapFileInput');
      if (swapInput) swapInput.onchange = (e) => { const f = e.target.files && e.target.files[0]; if (f) handleMediaFile(f); e.target.value = ''; };
      const dropzone = document.getElementById('swapDropzone');
      if (dropzone) {
        dropzone.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('dropzone-active'); };
        dropzone.ondragleave = () => dropzone.classList.remove('dropzone-active');
        dropzone.ondrop = (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('dropzone-active'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleMediaFile(f); };
      }

      const saveDirectBtn = document.getElementById('saveDirectUrlBtn');
      const directInput = document.getElementById('directCloudUrlInput');
      if (saveDirectBtn && directInput) {
        const submitUrl = () => {
          const val = directInput.value.trim();
          const errBox = document.getElementById('swapErrBox');
          if (!/^https?:\/\//i.test(val)) {
            const msg = 'Please paste a valid https:// Cloudinary URL.';
            if (errBox) { errBox.textContent = msg; errBox.classList.remove('hidden'); }
            showToast(msg);
            return;
          }
          if (errBox) errBox.classList.add('hidden');
          assignUrlToSlot(selectedMediaSlot, val, { isVideo: isVideoUrl(val) });
          directInput.value = '';
          showToast('Direct Cloud URL saved & syncing to Firestore!');
        };
        saveDirectBtn.onclick = submitUrl;
        directInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submitUrl(); } };
      }

      const addOrgBtn = document.getElementById('addOrgBtn');
      if (addOrgBtn) {
        addOrgBtn.onclick = () => {
          PORTFOLIO_CONFIG.affiliations = PORTFOLIO_CONFIG.affiliations || [];
          PORTFOLIO_CONFIG.affiliations.unshift({ id: 'aff-' + Date.now().toString(36), name: 'New Organization', role: '', logoUrl: null, websiteUrl: '', lightLogoBg: false });
          renderPortfolio(); renderStudioDrawer(); scheduleCloudSave(false);
        };
      }
      document.querySelectorAll('[data-aff-name]').forEach((inp) => {
        inp.oninput = () => { PORTFOLIO_CONFIG.affiliations[Number(inp.getAttribute('data-aff-name'))].name = inp.value; renderPortfolio(); scheduleCloudSave(false); };
      });
      document.querySelectorAll('[data-aff-light]').forEach((cb) => {
        cb.onchange = () => { PORTFOLIO_CONFIG.affiliations[Number(cb.getAttribute('data-aff-light'))].lightLogoBg = cb.checked; renderPortfolio(); scheduleCloudSave(false); };
      });
      document.querySelectorAll('[data-aff-del]').forEach((btn) => {
        btn.onclick = () => { PORTFOLIO_CONFIG.affiliations.splice(Number(btn.getAttribute('data-aff-del')), 1); renderPortfolio(); renderStudioDrawer(); scheduleCloudSave(true); };
      });
      document.querySelectorAll('[data-aff-file]').forEach((inp) => {
        inp.onchange = async () => {
          const f = inp.files && inp.files[0]; if (!f) return;
          const idx = Number(inp.getAttribute('data-aff-file'));
          try {
            showToast('Uploading logo to Cloudinary...');
            const res = await uploadToCloudinary(f);
            PORTFOLIO_CONFIG.affiliations[idx].logoUrl = res.secureUrl;
            renderPortfolio(); renderStudioDrawer(); scheduleCloudSave(true);
            showToast('Logo uploaded & syncing!');
          } catch (err) { showToast('Logo upload error: ' + ((err && err.message) || 'Failed')); }
        };
      });

      const pubSync = document.getElementById('publishSyncBtn');
      if (pubSync) pubSync.onclick = () => saveConfigToCloud(true);
      const expJson = document.getElementById('exportJsonBtn');
      if (expJson) {
        expJson.onclick = () => {
          const blob = new Blob([JSON.stringify(PORTFOLIO_CONFIG, null, 2)], { type: 'application/json' });
          const u = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = u; a.download = 'rayon-portfolio-backup.json'; a.click();
          URL.revokeObjectURL(u);
        };
      }
    }

    // Escape closes Lightbox
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightboxState) { lightboxState = null; renderLightbox(); }
    });

    // Firebase Auth observer
    onAuthStateChanged(auth, (user) => {
      adminUser = user;
      if (!user) { drawerOpen = false; editMode = false; }
      renderPortfolio();
      renderStudioDrawer();
    });

    // Initial render + live Firestore fetch from portfolio/main
    renderPortfolio();
    getDoc(doc(db, 'portfolio', 'main'))
      .then((snap) => {
        if (snap.exists()) {
          PORTFOLIO_CONFIG = mergeConfig(DEFAULT_PORTFOLIO_CONFIG, snap.data());
          cloudStatus = 'Synced to Cloud';
          cloudState = 'synced';
          renderPortfolio();
          if (drawerOpen) renderStudioDrawer();
        }
      })
      .catch((err) => {
        console.warn('Firestore load fallback:', err);
      });
  </script>
</body>
</html>`;

export function generateStandaloneIndexHtml(config: PortfolioConfig): string {
  const safeJson = JSON.stringify(config, null, 2).replace(/<\/script>/gi, '<\\/script>');
  const safeTitle = (config.copy.siteTitle || 'Raymond Ajimuda — Creative Director | Ray-On Brand Agency')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return STANDALONE_HTML_TEMPLATE
    .replace(/__SITE_TITLE__/g, safeTitle)
    .replace('__PORTFOLIO_CONFIG_JSON__', () => safeJson);
}
