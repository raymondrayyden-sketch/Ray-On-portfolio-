import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { DEFAULT_PORTFOLIO_CONFIG } from './data/defaultPortfolio';
import type {
  LightboxSelection,
  PortfolioConfig,
  PortfolioCopy,
} from './types/portfolio';
import {
  buildQRCodeFallbackSVG,
  buildRayOnLogoSVG,
  buildStudioPortraitSVG,
  buildToolVectorIcon,
  copySafely,
  deepClone,
  openExternalUrl,
} from './utils/svgArtwork';
import {
  generateStandaloneIndexHtml,
  prepareConfigForStandaloneExport,
} from './utils/exportStandaloneHtml';
import {
  loadConfigFromCloud,
  readCachedPortfolioConfig,
  saveConfigToCloud,
  signOutAdmin,
  subscribeAdminAuth,
} from './services/portfolioCloud';
import { ResilientImage } from './components/ResilientImage';
import { EditableText } from './components/EditableText';
import { RetouchSlider } from './components/RetouchSlider';
import { ProjectTile } from './components/ProjectTile';
import { VideoReelCard } from './components/VideoReelCard';
import { TiltPortrait } from './components/TiltPortrait';
import { LightboxModal } from './components/LightboxModal';
import {
  StudioEditorDrawer,
  type CloudSyncState,
  type CollectionKey,
  type StudioTab,
} from './components/StudioEditorDrawer';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AffiliationsMarquee } from './components/AffiliationsMarquee';

export default function App() {
  const [initialCache] = useState<PortfolioConfig | null>(() => readCachedPortfolioConfig());
  const [config, setConfig] = useState<PortfolioConfig>(
    () => initialCache ?? deepClone(DEFAULT_PORTFOLIO_CONFIG)
  );
  const [isInitialCloudLoading, setIsInitialCloudLoading] = useState<boolean>(() => !initialCache);
  const [cloudState, setCloudState] = useState<CloudSyncState>(() =>
    initialCache ? 'synced' : 'loading'
  );
  const [storageStatus, setStorageStatus] = useState<string>(() =>
    initialCache ? 'Synced to Cloud' : 'Loading from Cloud...'
  );
  const [editMode, setEditMode] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerInitialTab, setDrawerInitialTab] = useState<StudioTab>('copy');
  const [drawerInitialCollection, setDrawerInitialCollection] = useState<CollectionKey | undefined>(
    undefined
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Firebase Admin Auth state (protects Edit Site studio & cloud writes)
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isAdminRevealed, setIsAdminRevealed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.search.includes('admin=true')
  );
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [pendingStudioTab, setPendingStudioTab] = useState<StudioTab>('copy');
  const [pendingStudioCollection, setPendingStudioCollection] = useState<CollectionKey | undefined>(
    undefined
  );

  // Refs for debounced Firestore writes & secret 5-tap navbar logo unlock
  const latestConfigRef = useRef<PortfolioConfig>(config);
  const cloudSaveTimerRef = useRef<number | null>(null);
  const logoTapTimestampsRef = useRef<number[]>([]);

  const showAdminControls = isAdminRevealed || Boolean(adminUser);

  // Filters
  const [activeIdentityCategory, setActiveIdentityCategory] = useState<string>('All');
  const [activeVideoCategory, setActiveVideoCategory] = useState<string>('All');

  // Touch morph tracking (cleared when clicking empty space)
  const [activeMorphKey, setActiveMorphKey] = useState<string | null>(null);
  const [activeTileMorph, setActiveTileMorph] = useState<{ group: string; id: string } | null>(null);

  // Lightbox
  const [lightboxSelection, setLightboxSelection] = useState<LightboxSelection | null>(null);

  // Booking Inquiry Form
  const [inqName, setInqName] = useState('');
  const [inqBrand, setInqBrand] = useState('');
  const [inqService, setInqService] = useState(config.services[0] || '');
  const [inqTimeline, setInqTimeline] = useState('ASAP / Urgent');
  const [inqMessage, setInqMessage] = useState('');

  // Toast
  const [toastText, setToastText] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 2800);
  }, []);

  // Sync document title & body edit-mode class
  useEffect(() => {
    document.title = config.copy.siteTitle || 'Raymond Ajimuda — Creative Director | Ray-On Brand Agency';
  }, [config.copy.siteTitle]);

  // Load live portfolio config from Firebase Firestore (portfolio/main) on page load
  // Repeat visits render instantly from localStorage cache, then silently refresh here
  useEffect(() => {
    let active = true;
    void loadConfigFromCloud().then((res) => {
      if (!active) return;
      latestConfigRef.current = res.config;
      setConfig(res.config);
      setIsInitialCloudLoading(false);
      if (res.existsInCloud) {
        setCloudState('synced');
        setStorageStatus('Synced to Cloud');
      } else if (res.error) {
        setCloudState('idle');
        setStorageStatus('Default portfolio loaded');
      } else {
        setCloudState('idle');
        setStorageStatus('Default portfolio (not yet published)');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Subscribe to Firebase Admin Email/Password authentication state
  useEffect(() => {
    const unsubscribe = subscribeAdminAuth((user) => {
      setAdminUser(user);
      if (!user) {
        setEditMode(false);
        setIsDrawerOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Clean up any pending cloud save debounce timer on unmount
  useEffect(() => {
    return () => {
      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current);
      }
    };
  }, []);

  const openStudioAt = useCallback(
    (tab: StudioTab, collection?: CollectionKey) => {
      if (adminUser) {
        setDrawerInitialTab(tab);
        setDrawerInitialCollection(collection);
        setIsDrawerOpen(true);
      } else {
        setPendingStudioTab(tab);
        setPendingStudioCollection(collection);
        setIsLoginModalOpen(true);
      }
    },
    [adminUser]
  );

  const handleAdminSignOut = useCallback(async () => {
    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    await signOutAdmin();
    setIsDrawerOpen(false);
    setEditMode(false);
    setIsAdminRevealed(
      typeof window !== 'undefined' && window.location.search.includes('admin=true')
    );
    showToast('Signed out of Admin Studio');
  }, [showToast]);

  const handleNavLogoTap = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (editMode) {
        e.preventDefault();
        return;
      }
      const now = Date.now();
      const recent = [...logoTapTimestampsRef.current.filter((t) => now - t <= 3000), now];
      logoTapTimestampsRef.current = recent;

      if (recent.length > 1) {
        e.preventDefault();
      }

      if (recent.length >= 5) {
        logoTapTimestampsRef.current = [];
        setIsAdminRevealed(true);
        showToast('Edit Site unlocked');
      }
    },
    [editMode, showToast]
  );

  useEffect(() => {
    document.body.classList.toggle('edit-mode-active', editMode);
    return () => {
      document.body.classList.remove('edit-mode-active');
    };
  }, [editMode]);

  // Keep inquiry service synced if user edits services list
  useEffect(() => {
    if (config.services.length > 0 && !config.services.includes(inqService)) {
      setInqService(config.services[0]);
    }
  }, [config.services, inqService]);

  // Scroll Reveal Observer
  useEffect(() => {
    const sections = document.querySelectorAll('.reveal-section');
    if (typeof IntersectionObserver === 'undefined') {
      sections.forEach((s) => s.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Prevent accidental browser navigation/white-screen if a dragged file misses the dropzone
  useEffect(() => {
    const preventWindowDropNavigation = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventWindowDropNavigation);
    window.addEventListener('drop', preventWindowDropNavigation);
    return () => {
      window.removeEventListener('dragover', preventWindowDropNavigation);
      window.removeEventListener('drop', preventWindowDropNavigation);
    };
  }, []);

  // Clear touch morph states when tapping/clicking elsewhere
  useEffect(() => {
    const handleDocClick = () => {
      setActiveMorphKey(null);
      setActiveTileMorph(null);
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  const commitConfigToCloud = useCallback(
    async (targetConfig: PortfolioConfig, notifyOnSuccess = false) => {
      setCloudState('saving');
      setStorageStatus('Saving...');
      try {
        const res = await saveConfigToCloud(targetConfig);
        if (res.ok) {
          if (res.cleanedConfig && res.strippedBase64Count && res.strippedBase64Count > 0) {
            latestConfigRef.current = res.cleanedConfig;
            setConfig(res.cleanedConfig);
          }
          setCloudState('synced');
          setStorageStatus(res.status || 'Synced to Cloud');
          if (res.warning) {
            showToast(res.warning);
          } else if (notifyOnSuccess) {
            showToast('Synced to Cloud!');
          }
        } else {
          const exactErr = res.error || res.status || 'Cloud save failed';
          setCloudState('error');
          setStorageStatus(res.status || `Cloud save failed: ${exactErr}`);
          showToast(`Firestore save error: ${exactErr}`);
        }
      } catch (err) {
        const exactErr = err instanceof Error ? err.message : String(err || 'Unexpected cloud save error');
        setCloudState('error');
        setStorageStatus(`Cloud save failed: ${exactErr}`);
        showToast(`Firestore save error: ${exactErr}`);
      }
    },
    [showToast]
  );

  const handleSaveNow = useCallback(async () => {
    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    await commitConfigToCloud(latestConfigRef.current, true);
  }, [commitConfigToCloud]);

  const updateConfig = useCallback(
    (updater: (prev: PortfolioConfig) => PortfolioConfig, options?: { immediate?: boolean }) => {
      if (!adminUser) {
        showToast('Please sign in as admin to edit or save changes.');
        return;
      }
      const next = updater(latestConfigRef.current);
      latestConfigRef.current = next;
      setConfig(next);
      setCloudState('saving');
      setStorageStatus('Saving...');

      if (cloudSaveTimerRef.current) {
        window.clearTimeout(cloudSaveTimerRef.current);
        cloudSaveTimerRef.current = null;
      }

      if (options?.immediate) {
        void commitConfigToCloud(next);
      } else {
        cloudSaveTimerRef.current = window.setTimeout(() => {
          cloudSaveTimerRef.current = null;
          void commitConfigToCloud(latestConfigRef.current);
        }, 550);
      }
    },
    [adminUser, commitConfigToCloud, showToast]
  );

  const handleCopyFieldChange = useCallback(
    (key: keyof PortfolioCopy, newVal: string) => {
      updateConfig((prev) => ({
        ...prev,
        copy: { ...prev.copy, [key]: newVal },
      }));
      showToast('Text updated — syncing to Cloud...');
    },
    [updateConfig, showToast]
  );

  const handleDownloadStandaloneHtml = useCallback(async () => {
    showToast('Baking standalone index.html...');
    const prepared = await prepareConfigForStandaloneExport(config);
    const html = generateStandaloneIndexHtml(prepared);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded ready-to-host index.html!');
  }, [config, showToast]);

  const handleResetAll = useCallback(() => {
    const fresh = deepClone(DEFAULT_PORTFOLIO_CONFIG);
    latestConfigRef.current = fresh;
    setConfig(fresh);
    setEditMode(false);
    if (cloudSaveTimerRef.current) {
      window.clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    void commitConfigToCloud(fresh, false);
    showToast('Defaults restored & syncing to Cloud!');
  }, [commitConfigToCloud, showToast]);

  // Dynamic category filters
  const identityCategories = useMemo(() => {
    const unique = Array.from(new Set(config.identityProjects.map((p) => p.category).filter(Boolean)));
    return ['All', ...unique];
  }, [config.identityProjects]);

  const effectiveIdentityCat = identityCategories.includes(activeIdentityCategory)
    ? activeIdentityCategory
    : 'All';

  const filteredIdentityProjects = useMemo(
    () =>
      effectiveIdentityCat === 'All'
        ? config.identityProjects
        : config.identityProjects.filter((p) => p.category === effectiveIdentityCat),
    [config.identityProjects, effectiveIdentityCat]
  );

  const videoCategories = useMemo(() => {
    const unique = Array.from(new Set(config.videoReels.map((v) => v.category).filter(Boolean)));
    return ['All', ...unique];
  }, [config.videoReels]);

  const effectiveVideoCat = videoCategories.includes(activeVideoCategory)
    ? activeVideoCategory
    : 'All';

  const filteredVideoReels = useMemo(
    () =>
      effectiveVideoCat === 'All'
        ? config.videoReels
        : config.videoReels.filter((v) => v.category === effectiveVideoCat),
    [config.videoReels, effectiveVideoCat]
  );

  // Derived links
  const waCtaUrl = `${config.profile.whatsappUrl}?text=${encodeURIComponent(
    `Hello ${config.profile.name}, I viewed your ${config.profile.agency} portfolio and would love to discuss a project!`
  )}`;

  const qrSrc =
    config.images.qrCode ||
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      config.profile.instagramUrl
    )}`;

  const toggleMorph = (key: string) => {
    setActiveTileMorph(null);
    setActiveMorphKey((prev) => (prev === key ? null : key));
  };

  const buildBriefText = () => {
    const lines = [
      `Hello ${config.profile.name}! I'd love to start a project with ${config.profile.agency}.`,
      '',
      `Name: ${inqName.trim() || 'Not specified'}`,
      `Brand / Company: ${inqBrand.trim() || 'Not specified'}`,
      `Service Needed: ${inqService || 'Creative Direction'}`,
      `Timeline: ${inqTimeline}`,
      '',
      `Project Brief:`,
      inqMessage.trim() || '(No details provided)',
    ];
    return lines.join('\n');
  };

  const handleInquiryWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inqName.trim() || !inqMessage.trim()) {
      showToast('Please enter your name and a brief project note.');
      return;
    }
    const url = `${config.profile.whatsappUrl}?text=${encodeURIComponent(buildBriefText())}`;
    openExternalUrl(url);
    showToast('Opening WhatsApp with your pre-filled brief!');
  };

  const handleInquiryEmail = () => {
    if (!inqName.trim() || !inqMessage.trim()) {
      showToast('Please enter your name and a brief project note.');
      return;
    }
    const subject = encodeURIComponent(
      `Project Inquiry: ${inqService} — ${inqBrand.trim() || inqName.trim()}`
    );
    const body = encodeURIComponent(buildBriefText());
    openExternalUrl(`mailto:${config.profile.email}?subject=${subject}&body=${body}`);
    showToast('Opening your email app with the brief!');
  };

  const handleCopyPhone = async () => {
    const ok = await copySafely(config.profile.whatsappDisplay);
    showToast(ok ? `Copied ${config.profile.whatsappDisplay}!` : 'Could not copy automatically.');
  };

  return (
    <div className="min-h-screen bg-editorial-dark text-white">
      {/* Floating On-Page Edit Mode Banner */}
      {editMode && (
        <div
          id="editModeBanner"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-2xl rounded-2xl bg-obsidian/95 backdrop-blur-xl border-2 border-crimson px-4 py-3 shadow-[0_0_40px_rgba(230,10,21,0.5)] flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-crimson animate-pulse" />
            <div className="text-xs leading-tight">
              <strong className="text-white block">On-Page Text Editing is ON</strong>
              <span className="text-zinc-300">
                Click any text with a dashed border to rewrite it directly.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-semibold text-zinc-200">
              {storageStatus}
            </span>
            <button
              type="button"
              onClick={() => void handleSaveNow()}
              className="px-3 py-1.5 rounded-full bg-crimson hover:bg-red-600 text-[11px] font-bold text-white transition-colors"
            >
              Sync to Cloud
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. STICKY EDITORIAL NAVBAR
          ===================================================================== */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-obsidian/88 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Left: Ray-On Brand Agency Logo */}
          <a
            id="navLogoSlot"
            href="#top"
            onClick={handleNavLogoTap}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div
              className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform ${
                config.images.logoPrimary && config.imageLightBg?.logoPrimary
                  ? 'bg-white p-1 border border-white/80'
                  : 'bg-obsidian'
              }`}
            >
              <ResilientImage
                primarySrc={config.images.logoPrimary}
                fallbackSVG={buildRayOnLogoSVG(false, 'nav')}
                alt="Ray-On Brand Agency Logo"
                cloudinaryWidth={400}
                decoding="async"
                isSkeletonLoading={isInitialCloudLoading}
                className={
                  config.images.logoPrimary && config.imageLightBg?.logoPrimary
                    ? 'w-full h-full object-contain'
                    : 'w-full h-full object-contain logo-blend-lighten'
                }
              />
            </div>
            <div className="leading-tight">
              <EditableText
                as="span"
                copyKey="navBrandName"
                value={config.copy.navBrandName}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="block font-syne text-xs sm:text-sm font-extrabold tracking-[0.22em] text-white group-hover:text-crimson transition-colors"
              />
              <EditableText
                as="span"
                copyKey="navBrandSub"
                value={config.copy.navBrandSub}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="block font-montserrat text-[9px] sm:text-[10px] font-semibold tracking-[0.16em] text-zinc-400 uppercase"
              />
            </div>
          </a>

          {/* Center: Smooth Anchor Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center gap-5 text-[11px] font-montserrat font-semibold tracking-widest uppercase text-zinc-300">
            <a href="#about" className="hover:text-crimson transition-colors whitespace-nowrap">
              <EditableText
                copyKey="navAbout"
                value={config.copy.navAbout}
                editMode={editMode}
                onChange={handleCopyFieldChange}
              />
            </a>
            <a href="#branding" className="hover:text-crimson transition-colors whitespace-nowrap">
              <EditableText
                copyKey="navBranding"
                value={config.copy.navBranding}
                editMode={editMode}
                onChange={handleCopyFieldChange}
              />
            </a>
            <a href="#flyers" className="hover:text-crimson transition-colors whitespace-nowrap">
              <EditableText
                copyKey="navFlyers"
                value={config.copy.navFlyers}
                editMode={editMode}
                onChange={handleCopyFieldChange}
              />
            </a>
            <a href="#videos" className="hover:text-crimson transition-colors whitespace-nowrap">
              <EditableText
                copyKey="navVideos"
                value={config.copy.navVideos}
                editMode={editMode}
                onChange={handleCopyFieldChange}
              />
            </a>
            <a href="#photography" className="hover:text-crimson transition-colors whitespace-nowrap">
              <EditableText
                copyKey="navPhotography"
                value={config.copy.navPhotography}
                editMode={editMode}
                onChange={handleCopyFieldChange}
              />
            </a>
            <a href="#reviews" className="hover:text-crimson transition-colors whitespace-nowrap">
              <EditableText
                copyKey="navReviews"
                value={config.copy.navReviews}
                editMode={editMode}
                onChange={handleCopyFieldChange}
              />
            </a>
          </nav>

          {/* Right: No-Code Edit Site Studio (Admin Only) + Glowing VIEW WORK Pill + Mobile Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {showAdminControls && (
              <button
                id="openStudioDrawerBtn"
                type="button"
                onClick={() => openStudioAt('copy')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold bg-white/10 hover:bg-crimson text-white border border-white/15 hover:border-crimson transition-all whitespace-nowrap"
                title={adminUser ? 'Open Site Editor (Admin Signed In)' : 'Admin Sign In to Edit Site'}
              >
                {adminUser && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>Edit Site</span>
              </button>
            )}

            <a
              href="#branding"
              className="btn-crimson-pill group hidden sm:inline-flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full text-[11px] font-montserrat font-extrabold tracking-wider text-obsidian shadow-lg shadow-crimson/40 whitespace-nowrap"
            >
              <EditableText
                copyKey="heroCtaLabel"
                value={config.copy.heroCtaLabel}
                editMode={editMode}
                onChange={handleCopyFieldChange}
              />
              <span className="w-6 h-6 rounded-full bg-crimson text-white flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </a>

            <button
              type="button"
              aria-label="Toggle Menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-200 hover:text-white"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-obsidian/95 px-4 py-3 space-y-1">
            {[
              ['#about', '01 — About, What I Do & 12 Tools'],
              ['#branding', '02 — Brand & Social Media'],
              ['#flyers', '03 — Campaign Flyers'],
              ['#videos', '04 — Motion & Video Reels (GIFs)'],
              ['#photography', '05 — Photography & Retouching'],
              ['#reviews', '06 — Client Reviews'],
              ['#contact', 'Contact & Inquiry Form'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-xs font-semibold tracking-widest uppercase text-zinc-200 hover:bg-crimson/20 hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main id="top" className="relative">
        {/* =====================================================================
            2. HERO SECTION
            ===================================================================== */}
        <section className="relative overflow-hidden pt-6 pb-16 sm:pt-10 sm:pb-24">
          <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 w-[92vw] max-w-2xl h-[440px] rounded-full bg-crimson/28 blur-[128px]" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* Hero Editorial Top Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-crimson/40">
              <div className="flex items-center gap-2.5 text-[11px] sm:text-xs font-montserrat tracking-[0.2em] uppercase text-crimson/95 font-bold">
                <EditableText
                  copyKey="heroTopStrip"
                  value={config.copy.heroTopStrip}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                />
              </div>

              <a
                href="#branding"
                className="btn-crimson-pill group inline-flex items-center gap-3 pl-5 pr-2 py-2 rounded-full text-xs sm:text-sm font-montserrat font-extrabold tracking-wider text-obsidian shadow-xl shadow-crimson/40"
              >
                <EditableText
                  copyKey="heroCtaLabel"
                  value={config.copy.heroCtaLabel}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                />
                <span className="w-7 h-7 rounded-full bg-crimson text-white flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </a>
            </div>

            {/* Centered Studio Portrait + Bold Angular Chevron Framing */}
            <div className="relative mt-7 sm:mt-10 flex flex-col items-center">
              <div className="mb-4 text-[11px] font-medium text-zinc-400 text-center">
                <EditableText
                  copyKey="heroTipText"
                  value={config.copy.heroTipText}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                />
              </div>

              <div className="relative w-full max-w-3xl flex flex-col items-center">
                <div className="hidden sm:block absolute top-4 w-80 md:w-[420px] h-56 rounded-full bg-crimson/35 blur-3xl -z-10" />

                <TiltPortrait
                  id="heroPortraitCard"
                  editMode={editMode}
                  isMorphed={activeMorphKey === 'hero-portrait'}
                  onToggleMorph={() => toggleMorph('hero-portrait')}
                  className={`morph-portrait morph-portrait-hero relative z-10 w-64 h-80 sm:w-80 sm:h-[400px] overflow-hidden border-2 border-crimson/55 shadow-[0_0_54px_rgba(230,10,21,0.42)] ${
                    config.images.heroPortrait && config.imageLightBg?.heroPortrait
                      ? 'bg-white'
                      : 'bg-obsidian'
                  }`}
                >
                  <div
                    className={`morph-portrait-media w-full h-full flex items-center justify-center ${
                      config.images.heroPortrait && config.imageLightBg?.heroPortrait
                        ? 'p-4'
                        : 'hero-portrait-feather'
                    }`}
                  >
                    <ResilientImage
                      primarySrc={config.images.heroPortrait}
                      fallbackSVG={buildStudioPortraitSVG('hero')}
                      alt="Raymond Ajimuda Studio Portrait"
                      cloudinaryWidth={900}
                      fetchPriority="high"
                      loading="eager"
                      decoding="async"
                      className={
                        config.images.heroPortrait && config.imageLightBg?.heroPortrait
                          ? 'w-full h-full object-contain'
                          : 'w-full h-full object-cover object-top'
                      }
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-obsidian/85 via-transparent to-obsidian/20" />
                  <EditableText
                    as="div"
                    copyKey="heroPortraitBadge"
                    value={config.copy.heroPortraitBadge}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-obsidian/75 backdrop-blur-md border border-white/15 text-[10px] font-montserrat tracking-widest uppercase text-white/95 whitespace-nowrap"
                  />
                </TiltPortrait>

                <div className="relative w-full -mt-12 sm:-mt-16 pt-14 sm:pt-20 pb-8 px-4 flex flex-col items-center text-center z-20">
                  <svg
                    className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
                    viewBox="0 0 900 320"
                    preserveAspectRatio="none"
                    fill="none"
                  >
                    <defs>
                      <linearGradient id="heroChevronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E60A15" />
                        <stop offset="50%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#E60A15" />
                      </linearGradient>
                      <filter id="heroGlowLine">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <polyline
                      points="-40,18 168,122 38,248 612,312 812,146 734,86 940,10"
                      stroke="url(#heroChevronGrad)"
                      strokeWidth="2.6"
                      filter="url(#heroGlowLine)"
                      opacity="0.92"
                    />
                    <polyline
                      points="168,122 68,236 602,294 786,144"
                      stroke="#E60A15"
                      strokeWidth="1.15"
                      opacity="0.48"
                    />
                  </svg>

                  <EditableText
                    as="h1"
                    copyKey="heroTitle"
                    value={config.copy.heroTitle}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="relative font-syne text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.9)]"
                  />
                  <EditableText
                    as="p"
                    copyKey="heroSubtitle"
                    value={config.copy.heroSubtitle}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="relative mt-2 font-montserrat text-sm sm:text-xl md:text-2xl font-bold tracking-wide text-crimson-white"
                  />

                  <div className="relative mt-4 flex items-center gap-2">
                    <span className="block w-36 sm:w-56 h-1.5 rounded-full bg-gradient-to-r from-crimson via-red-400 to-white shadow-[0_0_16px_rgba(230,10,21,0.92)]" />
                    <span className="block w-2 h-2 rounded-sm bg-white shadow-[0_0_10px_#ffffff]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Bottom Bar */}
            <div className="mt-6 sm:mt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-3.5 bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-3xl sm:rounded-full pl-2.5 pr-5 py-2.5 max-w-full">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/80 bg-obsidian shrink-0">
                  <ResilientImage
                    primarySrc={config.images.heroPortrait}
                    fallbackSVG={buildStudioPortraitSVG('av1')}
                    alt={config.profile.name}
                    cloudinaryWidth={900}
                    decoding="async"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-montserrat font-bold text-sm sm:text-base text-white">
                      {config.profile.name}
                    </span>
                    <svg className="w-4 h-4 text-[#1DA1F2] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                    </svg>
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.11em] uppercase text-zinc-300 leading-snug">
                    {config.profile.currentRole}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-zinc-300">
                    <a
                      href={config.profile.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] hover:text-emerald-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.07c-.24.69-1.41 1.32-1.95 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.26-.29.58-.36.77-.36h.56c.18 0 .42-.07.66.5.24.58.83 2.02.9 2.17.07.15.12.32.02.51-.1.2-.15.32-.29.49-.15.17-.31.38-.44.51-.15.14-.3.3-.13.59.17.29.76 1.26 1.63 2.04 1.12 1 2.07 1.31 2.36 1.46.29.14.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.71.81 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.39z" />
                      </svg>
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={config.profile.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] hover:text-crimson transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                      </svg>
                      <span>{config.profile.instagramHandle}</span>
                    </a>
                    <a
                      href={`mailto:${config.profile.email}`}
                      className="inline-flex items-center gap-1 text-[11px] hover:text-crimson transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      <span>Email</span>
                    </a>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 self-end md:self-auto px-3 py-1.5 rounded-2xl border ${
                  config.images.logoPrimary && config.imageLightBg?.logoPrimary
                    ? 'bg-white border-white/80'
                    : 'bg-obsidian/60 border-white/10'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden">
                  <ResilientImage
                    primarySrc={config.images.logoPrimary}
                    fallbackSVG={buildRayOnLogoSVG(false, 'hero')}
                    alt="Ray-On Brand Agency Logo"
                    cloudinaryWidth={400}
                    decoding="async"
                    isSkeletonLoading={isInitialCloudLoading}
                    className={
                      config.images.logoPrimary && config.imageLightBg?.logoPrimary
                        ? 'w-full h-full object-contain'
                        : 'w-full h-full object-contain logo-blend-lighten'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            3. SECTION 01 — ABOUT ME, EXPERIENCE, WHAT I DO, 12 TOOLS & QR BENTO
            ===================================================================== */}
        <section id="about" className="reveal-section py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-xs font-montserrat font-semibold tracking-[0.22em] uppercase mb-3">
              <EditableText
                copyKey="aboutEyebrowLeft"
                value={config.copy.aboutEyebrowLeft}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson-white"
              />
              <EditableText
                copyKey="aboutEyebrowRight"
                value={config.copy.aboutEyebrowRight}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson/90"
              />
            </div>
            <div className="editorial-divider mb-8" />

            {/* TOP FULL-WIDTH CARD: ABOUT ME */}
            <div className="card-crimson-blush relative overflow-hidden rounded-[2rem] p-6 sm:p-9 shadow-2xl shadow-crimson/25">
              <div
                className={`pointer-events-none absolute -bottom-5 left-5 w-28 h-28 hidden sm:block ${
                  config.images.logoMonochrome && config.imageLightBg?.logoMonochrome
                    ? 'bg-white/90 rounded-2xl p-2 opacity-80'
                    : 'opacity-20'
                }`}
              >
                <ResilientImage
                  primarySrc={config.images.logoMonochrome}
                  fallbackSVG={buildRayOnLogoSVG(true, 'aboutwm')}
                  alt="Ray-On Monochrome Logo"
                  cloudinaryWidth={400}
                  loading="lazy"
                  decoding="async"
                  isSkeletonLoading={isInitialCloudLoading}
                  className={
                    config.images.logoMonochrome && config.imageLightBg?.logoMonochrome
                      ? 'w-full h-full object-contain'
                      : 'w-full h-full object-contain logo-blend-screen'
                  }
                />
              </div>

              <a
                href="#branding"
                aria-label="Explore Featured Branding"
                className="group absolute top-5 right-5 z-20 inline-flex items-center justify-center w-14 h-8 rounded-full bg-crimson text-white shadow-lg shadow-crimson/40 hover:w-16 transition-all"
              >
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-center relative z-10">
                <div className="md:col-span-7 pr-0 md:pr-4">
                  <EditableText
                    as="h2"
                    copyKey="aboutHeading"
                    value={config.copy.aboutHeading}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="font-montserrat text-2xl sm:text-3xl font-extrabold tracking-wide uppercase text-white drop-shadow-sm"
                  />
                  <div className="mt-2 mb-5 flex items-center gap-2">
                    <span className="block w-36 h-1 rounded-full bg-white" />
                    <span className="block w-1.5 h-1.5 bg-white" />
                  </div>

                  <EditableText
                    as="p"
                    copyKey="aboutBio1"
                    value={config.copy.aboutBio1}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    rich
                    className="text-sm sm:text-base leading-relaxed font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.22)]"
                  />
                  <EditableText
                    as="p"
                    copyKey="aboutBio2"
                    value={config.copy.aboutBio2}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    rich
                    className="mt-3.5 text-xs sm:text-sm leading-relaxed text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.18)]"
                  />
                  <EditableText
                    as="p"
                    copyKey="aboutBio3"
                    value={config.copy.aboutBio3}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    rich
                    className="mt-3 text-xs sm:text-sm leading-relaxed text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.16)]"
                  />
                </div>

                <div className="md:col-span-5 flex justify-center md:justify-end">
                  <TiltPortrait
                    id="aboutPortraitCard"
                    editMode={editMode}
                    isMorphed={activeMorphKey === 'about-portrait'}
                    onToggleMorph={() => toggleMorph('about-portrait')}
                    className={`morph-portrait morph-portrait-bento relative w-56 h-64 sm:w-64 sm:h-72 overflow-hidden border-2 border-white/80 shadow-2xl ${
                      config.images.aboutPortrait && config.imageLightBg?.aboutPortrait
                        ? 'bg-white p-3'
                        : 'monochrome bg-[#0a0a0a]'
                    }`}
                  >
                    <div className="morph-portrait-media w-full h-full">
                      <ResilientImage
                        primarySrc={config.images.aboutPortrait}
                        secondarySrc={config.images.aboutPortraitFallback}
                        fallbackSVG={buildStudioPortraitSVG('about')}
                        alt="Raymond Ajimuda Editorial Cutout Portrait"
                        cloudinaryWidth={900}
                        loading="lazy"
                        decoding="async"
                        isSkeletonLoading={isInitialCloudLoading}
                        className={
                          config.images.aboutPortrait && config.imageLightBg?.aboutPortrait
                            ? 'w-full h-full object-contain'
                            : 'w-full h-full object-cover object-top'
                        }
                      />
                    </div>
                    <EditableText
                      as="span"
                      copyKey="aboutPortraitHint"
                      value={config.copy.aboutPortraitHint}
                      editMode={editMode}
                      onChange={handleCopyFieldChange}
                      className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-obsidian/80 text-[10px] font-semibold tracking-wider text-white uppercase border border-white/15"
                    />
                  </TiltPortrait>
                </div>
              </div>
            </div>

            {/* FULL-WIDTH EXPERIENCE, SERVICES, CONTACT & TOOLS CARD */}
            <div className="mt-6">
              <div className="card-crimson-vibrant rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-crimson/20 flex flex-col justify-between gap-7">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
                  <div className="md:col-span-6 space-y-6">
                    <div>
                      <EditableText
                        as="h3"
                        copyKey="experienceHeading"
                        value={config.copy.experienceHeading}
                        editMode={editMode}
                        onChange={handleCopyFieldChange}
                        className="font-montserrat text-xl font-extrabold tracking-wide uppercase text-white"
                      />
                      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full border-2 border-white/95 text-xs sm:text-sm font-montserrat font-bold tracking-wider text-white">
                          {config.profile.experience}
                        </div>
                        {config.cv?.fileUrl ? (
                          <a
                            href={config.cv.fileUrl}
                            download={config.cv.fileName || 'Raymond_Ajimuda_CV.pdf'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-crimson hover:bg-obsidian hover:text-white border-2 border-white text-xs sm:text-sm font-montserrat font-extrabold tracking-wider transition-all shadow-md"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>{config.cv.buttonLabel || 'Download CV'}</span>
                          </a>
                        ) : showAdminControls ? (
                          <button
                            type="button"
                            onClick={() => openStudioAt('media')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-obsidian/30 hover:bg-white hover:text-crimson border border-white/60 text-xs font-montserrat font-bold tracking-wider text-white transition-all"
                            title="Upload your CV (PDF/DOCX) inside the Site Editor"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span>Upload CV</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <EditableText
                        as="h3"
                        copyKey="whatIDoHeading"
                        value={config.copy.whatIDoHeading}
                        editMode={editMode}
                        onChange={handleCopyFieldChange}
                        className="font-montserrat text-lg font-extrabold tracking-wide uppercase text-white"
                      />
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {config.services.map((srv, idx) => {
                          const mKey = `srv-${idx}`;
                          return (
                            <span
                              key={`${srv}-${idx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMorph(mKey);
                              }}
                              className={`service-pill inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-obsidian/28 border border-white/40 text-[11px] font-semibold text-white ${
                                activeMorphKey === mKey ? 'is-morphed' : ''
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{srv}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <EditableText
                        as="h3"
                        copyKey="contactHeading"
                        value={config.copy.contactHeading}
                        editMode={editMode}
                        onChange={handleCopyFieldChange}
                        className="font-montserrat text-lg font-extrabold tracking-wide uppercase text-white"
                      />
                      <div className="mt-2.5 space-y-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={config.profile.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/90 bg-white/15 hover:bg-white hover:text-crimson text-xs font-bold text-white transition-all shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.07c-.24.69-1.41 1.32-1.95 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.26-.29.58-.36.77-.36h.56c.18 0 .42-.07.66.5.24.58.83 2.02.9 2.17.07.15.12.32.02.51-.1.2-.15.32-.29.49-.15.17-.31.38-.44.51-.15.14-.3.3-.13.59.17.29.76 1.26 1.63 2.04 1.12 1 2.07 1.31 2.36 1.46.29.14.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.71.81 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.39z" />
                            </svg>
                            <span>{config.profile.whatsappDisplay}</span>
                          </a>
                          <button
                            type="button"
                            onClick={handleCopyPhone}
                            className="px-2.5 py-1.5 rounded-full bg-obsidian/30 hover:bg-obsidian/60 text-white text-[10px] font-semibold transition-colors"
                          >
                            Copy
                          </button>
                        </div>

                        <a
                          href={`mailto:${config.profile.email}`}
                          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white hover:underline break-all"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                          </svg>
                          <span>{config.profile.email}</span>
                        </a>

                        <div>
                          <a
                            href={config.profile.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white hover:underline"
                          >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="2" width="20" height="20" rx="5" />
                              <circle cx="12" cy="12" r="4" />
                              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                            </svg>
                            <span>{config.profile.instagramHandle}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-6">
                    <div className="flex items-center justify-between mb-3.5">
                      <EditableText
                        as="h3"
                        copyKey="toolsHeading"
                        value={config.copy.toolsHeading}
                        editMode={editMode}
                        onChange={handleCopyFieldChange}
                        className="font-montserrat text-xl font-extrabold tracking-wide uppercase text-white"
                      />
                      <EditableText
                        as="span"
                        copyKey="toolsBadge"
                        value={config.copy.toolsBadge}
                        editMode={editMode}
                        onChange={handleCopyFieldChange}
                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-obsidian/25 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
                      {config.tools.map((tool) => {
                        const tKey = `tool-${tool.id}`;
                        return (
                          <button
                            key={tool.id}
                            type="button"
                            aria-label={tool.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMorph(tKey);
                            }}
                            className={`tool-tile relative aspect-square w-full flex flex-col items-center justify-center gap-0.5 shadow-lg border-2 p-1.5 ${
                              activeMorphKey === tKey ? 'is-morphed' : ''
                            }`}
                            style={{ background: tool.bg, borderColor: tool.border }}
                          >
                            <span
                              className="flex items-center justify-center"
                              dangerouslySetInnerHTML={{ __html: buildToolVectorIcon(tool) }}
                            />
                            <span className="text-[8.5px] font-montserrat font-bold tracking-tight text-white/90 truncate max-w-full leading-none mt-0.5">
                              {tool.name.split(' ')[0]}
                            </span>
                            <span className="tool-tooltip absolute -top-8 left-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-obsidian text-white text-[10px] font-semibold shadow-lg border border-white/20 z-30">
                              {tool.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="block flex-1 h-2 rounded-full bg-gradient-to-r from-crimson via-red-300 to-white" />
                  <span className="block w-2.5 h-2.5 rounded-sm bg-crimson" />
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="editorial-divider flex-1" />
              <span className="font-montserrat text-sm font-bold tracking-widest text-white/75 tabular-nums">01</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. SECTION 02 — BRAND & SOCIAL MEDIA
            ===================================================================== */}
        <section id="branding" className="reveal-section py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-xs font-montserrat font-semibold tracking-[0.22em] uppercase mb-3">
              <EditableText
                copyKey="brandingEyebrowLeft"
                value={config.copy.brandingEyebrowLeft}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson-white"
              />
              <EditableText
                copyKey="brandingEyebrowRight"
                value={config.copy.brandingEyebrowRight}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson/90"
              />
            </div>
            <div className="editorial-divider mb-7" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
              <div>
                <h2 className="font-syne text-3xl sm:text-5xl font-extrabold tracking-tight">
                  <EditableText
                    copyKey="brandingTitleAccent"
                    value={config.copy.brandingTitleAccent}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="text-crimson"
                  />{' '}
                  <EditableText
                    copyKey="brandingTitleRest"
                    value={config.copy.brandingTitleRest}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="text-white"
                  />
                </h2>
                <EditableText
                  as="p"
                  copyKey="brandingSubtitle"
                  value={config.copy.brandingSubtitle}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  className="mt-2 text-xs sm:text-sm text-zinc-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {identityCategories.map((cat) => {
                  const isActive = cat === effectiveIdentityCat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveIdentityCategory(cat)}
                      className={`px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-crimson text-white shadow-lg shadow-crimson/45 scale-105'
                          : 'bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white border border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid-frame-striped rounded-[2rem] p-4 sm:p-6 shadow-2xl shadow-crimson/25">
              <div
                className={`portfolio-grid-group relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 ${
                  activeTileMorph?.group === 'identity' ? 'has-touch-active' : ''
                }`}
              >
                {filteredIdentityProjects.map((project) => (
                  <ProjectTile
                    key={project.id}
                    project={project}
                    isCloudLoading={isInitialCloudLoading}
                    isTouchMorphed={
                      activeTileMorph?.group === 'identity' && activeTileMorph.id === project.id
                    }
                    onTouchMorph={(id) => {
                      setActiveMorphKey(null);
                      setActiveTileMorph({ group: 'identity', id });
                    }}
                    onOpenLightbox={(id) => setLightboxSelection({ sectionType: 'identity', projectId: id })}
                  />
                ))}
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="editorial-divider flex-1" />
              <span className="font-montserrat text-sm font-bold tracking-widest text-white/75 tabular-nums">02</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            5. SECTION 03 — FLYERS & CAMPAIGN VISUALS
            ===================================================================== */}
        <section id="flyers" className="reveal-section py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-xs font-montserrat font-semibold tracking-[0.22em] uppercase mb-3">
              <EditableText
                copyKey="flyersEyebrowLeft"
                value={config.copy.flyersEyebrowLeft}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson-white"
              />
              <EditableText
                copyKey="flyersEyebrowRight"
                value={config.copy.flyersEyebrowRight}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson/90"
              />
            </div>
            <div className="editorial-divider mb-7" />

            <div className="mb-7">
              <h2 className="font-syne text-3xl sm:text-5xl font-extrabold tracking-tight">
                <EditableText
                  copyKey="flyersTitleAccent"
                  value={config.copy.flyersTitleAccent}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  className="text-crimson"
                />{' '}
                <EditableText
                  copyKey="flyersTitleRest"
                  value={config.copy.flyersTitleRest}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  className="text-white"
                />
              </h2>
              <EditableText
                as="p"
                copyKey="flyersSubtitle"
                value={config.copy.flyersSubtitle}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="mt-2 text-xs sm:text-sm text-zinc-400"
              />
            </div>

            <div className="grid-frame-striped rounded-[2rem] p-4 sm:p-6 shadow-2xl shadow-crimson/25">
              <div
                className={`portfolio-grid-group relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 ${
                  activeTileMorph?.group === 'flyers' ? 'has-touch-active' : ''
                }`}
              >
                {config.flyerProjects.map((project) => (
                  <ProjectTile
                    key={project.id}
                    project={project}
                    isCloudLoading={isInitialCloudLoading}
                    isTouchMorphed={
                      activeTileMorph?.group === 'flyers' && activeTileMorph.id === project.id
                    }
                    onTouchMorph={(id) => {
                      setActiveMorphKey(null);
                      setActiveTileMorph({ group: 'flyers', id });
                    }}
                    onOpenLightbox={(id) => setLightboxSelection({ sectionType: 'flyers', projectId: id })}
                  />
                ))}
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="editorial-divider flex-1" />
              <span className="font-montserrat text-sm font-bold tracking-widest text-white/75 tabular-nums">03</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            6. SECTION 04 — MOTION & VIDEO REELS
            ===================================================================== */}
        <section id="videos" className="reveal-section py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-xs font-montserrat font-semibold tracking-[0.22em] uppercase mb-3">
              <EditableText
                copyKey="videosEyebrowLeft"
                value={config.copy.videosEyebrowLeft}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson-white"
              />
              <EditableText
                copyKey="videosEyebrowRight"
                value={config.copy.videosEyebrowRight}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson/90"
              />
            </div>
            <div className="editorial-divider mb-7" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
              <div>
                <h2 className="font-syne text-3xl sm:text-5xl font-extrabold tracking-tight">
                  <EditableText
                    copyKey="videosTitleAccent"
                    value={config.copy.videosTitleAccent}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="text-crimson"
                  />{' '}
                  <EditableText
                    copyKey="videosTitleRest"
                    value={config.copy.videosTitleRest}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="text-white"
                  />
                </h2>
                <EditableText
                  as="p"
                  copyKey="videosSubtitle"
                  value={config.copy.videosSubtitle}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  className="mt-2 text-xs sm:text-sm text-zinc-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {videoCategories.map((cat) => {
                  const isActive = cat === effectiveVideoCat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveVideoCategory(cat)}
                      className={`px-3.5 py-2 rounded-full text-[11px] font-montserrat font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-crimson text-white shadow-lg shadow-crimson/45 scale-105'
                          : 'bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white border border-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid-frame-obsidian rounded-[2rem] p-4 sm:p-6 border border-crimson/35 shadow-2xl shadow-crimson/20">
              <div
                className={`portfolio-grid-group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 ${
                  activeTileMorph?.group === 'videos' ? 'has-touch-active' : ''
                }`}
              >
                {filteredVideoReels.map((reel) => (
                  <VideoReelCard
                    key={reel.id}
                    reel={reel}
                    isCloudLoading={isInitialCloudLoading}
                    isTouchMorphed={
                      activeTileMorph?.group === 'videos' && activeTileMorph.id === reel.id
                    }
                    onTouchMorph={(id) => {
                      setActiveMorphKey(null);
                      setActiveTileMorph({ group: 'videos', id });
                    }}
                    onOpenLightbox={(id) => setLightboxSelection({ sectionType: 'videos', projectId: id })}
                  />
                ))}
              </div>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="editorial-divider flex-1" />
              <span className="font-montserrat text-sm font-bold tracking-widest text-white/75 tabular-nums">04</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            7. SECTION 05 — PHOTOGRAPHY & RETOUCHING
            ===================================================================== */}
        <section id="photography" className="reveal-section py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-xs font-montserrat font-semibold tracking-[0.22em] uppercase mb-3">
              <EditableText
                copyKey="photoEyebrowLeft"
                value={config.copy.photoEyebrowLeft}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson-white"
              />
              <EditableText
                copyKey="photoEyebrowRight"
                value={config.copy.photoEyebrowRight}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson/90"
              />
            </div>
            <div className="editorial-divider mb-7" />

            <div className="mb-7">
              <h2 className="font-syne text-3xl sm:text-5xl font-extrabold tracking-tight">
                <EditableText
                  copyKey="photoTitleAccent"
                  value={config.copy.photoTitleAccent}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  className="text-crimson"
                />{' '}
                <EditableText
                  copyKey="photoTitleRest"
                  value={config.copy.photoTitleRest}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  className="text-white"
                />
              </h2>
              <EditableText
                as="p"
                copyKey="photoSubtitle"
                value={config.copy.photoSubtitle}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="mt-2 text-xs sm:text-sm text-zinc-400"
              />
            </div>

            <RetouchSlider
              beforeSrc={config.images.retouchBefore}
              afterSrc={config.images.retouchAfter}
              copy={config.copy}
              editMode={editMode}
              isCloudLoading={isInitialCloudLoading}
              onCopyChange={handleCopyFieldChange}
            />

            <div
              className={`portfolio-grid-group grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 ${
                activeTileMorph?.group === 'photos' ? 'has-touch-active' : ''
              }`}
            >
              {config.photoProjects.map((project) => (
                <ProjectTile
                  key={project.id}
                  project={project}
                  isCloudLoading={isInitialCloudLoading}
                  isTouchMorphed={
                    activeTileMorph?.group === 'photos' && activeTileMorph.id === project.id
                  }
                  onTouchMorph={(id) => {
                    setActiveMorphKey(null);
                    setActiveTileMorph({ group: 'photos', id });
                  }}
                  onOpenLightbox={(id) => setLightboxSelection({ sectionType: 'photos', projectId: id })}
                />
              ))}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="editorial-divider flex-1" />
              <span className="font-montserrat text-sm font-bold tracking-widest text-white/75 tabular-nums">05</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            8. SECTION 06 — CLIENT REVIEWS & TESTIMONIALS
            ===================================================================== */}
        <section id="reviews" className="reveal-section py-12 sm:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between text-xs font-montserrat font-semibold tracking-[0.22em] uppercase mb-3">
              <EditableText
                copyKey="reviewsEyebrowLeft"
                value={config.copy.reviewsEyebrowLeft}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson-white"
              />
              <EditableText
                copyKey="reviewsEyebrowRight"
                value={config.copy.reviewsEyebrowRight}
                editMode={editMode}
                onChange={handleCopyFieldChange}
                className="text-crimson/90"
              />
            </div>
            <div className="editorial-divider mb-7" />

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="font-syne text-3xl sm:text-5xl font-extrabold tracking-tight">
                  <EditableText
                    copyKey="reviewsTitleAccent"
                    value={config.copy.reviewsTitleAccent}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="text-crimson"
                  />{' '}
                  <EditableText
                    copyKey="reviewsTitleRest"
                    value={config.copy.reviewsTitleRest}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="text-white"
                  />
                </h2>
                <EditableText
                  as="p"
                  copyKey="reviewsSubtitle"
                  value={config.copy.reviewsSubtitle}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  className="mt-2 text-xs sm:text-sm text-zinc-400"
                />
              </div>

              <div className="inline-flex items-center gap-2 text-xs font-semibold text-white">
                <span className="text-amber-400">★★★★★</span>
                <EditableText
                  copyKey="reviewsBadge"
                  value={config.copy.reviewsBadge}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {config.testimonials.map((item, idx) => {
                const stars = Math.max(1, Math.min(5, Number(item.rating) || 5));
                const mKey = `review-${idx}`;
                return (
                  <div
                    key={`${item.brand}-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMorph(mKey);
                    }}
                    className={`testimonial-card relative bg-white/[0.04] backdrop-blur-md border border-white/10 p-6 flex flex-col justify-between gap-5 ${
                      activeMorphKey === mKey ? 'is-morphed' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-amber-400 text-sm tracking-widest" aria-label={`${stars} stars`}>
                          {'★'.repeat(stars)}
                        </div>
                        <span className="font-syne text-3xl leading-none text-crimson/75 select-none">“</span>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-200">{item.quote}</p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-montserrat text-sm font-bold text-white">{item.brand}</p>
                        <p className="text-[11px] text-zinc-400">
                          {item.author} • {item.sector}
                        </p>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-crimson/20 border border-crimson/45 text-crimson flex items-center justify-center text-xs font-extrabold">
                        {(item.brand || 'R').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="editorial-divider flex-1" />
              <span className="font-montserrat text-sm font-bold tracking-widest text-white/75 tabular-nums">06</span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            9. CLOSING SECTION — "THANK YOU!", BOOKING INQUIRY FORM & CONTACT
            ===================================================================== */}
        <section id="contact" className="reveal-section mt-8 bg-diagonal-crimson border-t border-crimson/40 relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Left Column */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4 overflow-visible">
                  <EditableText
                    as="h2"
                    copyKey="closingThankYou"
                    value={config.copy.closingThankYou}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    multiline
                    className="font-caveat text-7xl sm:text-8xl md:text-9xl font-bold leading-[1.04] text-brush-gradient drop-shadow-[0_6px_26px_rgba(230,10,21,0.48)] -rotate-3 inline-block px-2 pr-8 sm:pr-12 py-2 -ml-2 overflow-visible"
                  />
                  <div
                    className={`w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center ${
                      config.images.logoPrimary && config.imageLightBg?.logoPrimary
                        ? 'bg-white rounded-2xl p-2.5 border border-white/80 shadow-xl'
                        : ''
                    }`}
                  >
                    <ResilientImage
                      primarySrc={config.images.logoPrimary}
                      fallbackSVG={buildRayOnLogoSVG(false, 'footer')}
                      alt="Ray-On Brand Agency Logo"
                      cloudinaryWidth={400}
                      loading="lazy"
                      decoding="async"
                      isSkeletonLoading={isInitialCloudLoading}
                      className={
                        config.images.logoPrimary && config.imageLightBg?.logoPrimary
                          ? 'w-full h-full object-contain'
                          : 'w-full h-full object-contain logo-blend-lighten'
                      }
                    />
                  </div>
                </div>

                <EditableText
                  as="p"
                  copyKey="closingSummary"
                  value={config.copy.closingSummary}
                  editMode={editMode}
                  onChange={handleCopyFieldChange}
                  rich
                  className="text-sm sm:text-base leading-relaxed text-zinc-200 max-w-xl"
                />

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={waCtaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-crimson-pill group inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-xs sm:text-sm font-montserrat font-extrabold tracking-wider text-obsidian shadow-xl shadow-crimson/40"
                  >
                    <EditableText
                      copyKey="closingWhatsappCta"
                      value={config.copy.closingWhatsappCta}
                      editMode={editMode}
                      onChange={handleCopyFieldChange}
                    />
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </a>

                  <a
                    href={`mailto:${config.profile.email}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all"
                  >
                    <EditableText
                      copyKey="closingEmailCta"
                      value={config.copy.closingEmailCta}
                      editMode={editMode}
                      onChange={handleCopyFieldChange}
                    />
                  </a>

                  <a
                    href={config.profile.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-semibold bg-white/10 hover:bg-crimson border border-white/20 hover:border-crimson text-white transition-all"
                  >
                    <span>{config.profile.instagramHandle}</span>
                  </a>

                  {config.cv?.fileUrl && (
                    <a
                      href={config.cv.fileUrl}
                      download={config.cv.fileName || 'Raymond_Ajimuda_CV.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white hover:text-obsidian border border-white/25 text-white transition-all"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M12 18v-6" />
                        <path d="m9 15 3 3 3-3" />
                      </svg>
                      <span>{config.cv.buttonLabel || 'Download CV'}</span>
                    </a>
                  )}
                </div>

                {/* Inline Project Inquiry / Booking Form */}
                <form
                  onSubmit={handleInquiryWhatsApp}
                  className="rounded-[1.6rem] bg-obsidian/70 backdrop-blur-md border border-white/15 p-5 sm:p-6 space-y-4 shadow-2xl"
                >
                  <div>
                    <EditableText
                      as="h3"
                      copyKey="bookingHeading"
                      value={config.copy.bookingHeading}
                      editMode={editMode}
                      onChange={handleCopyFieldChange}
                      className="font-syne text-xl font-extrabold text-white block"
                    />
                    <EditableText
                      as="p"
                      copyKey="bookingSubheading"
                      value={config.copy.bookingSubheading}
                      editMode={editMode}
                      onChange={handleCopyFieldChange}
                      className="text-xs text-zinc-400 mt-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="inqName" className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Your Name *
                      </label>
                      <input
                        id="inqName"
                        type="text"
                        required
                        value={inqName}
                        onChange={(e) => setInqName(e.target.value)}
                        placeholder="e.g. Tolu Adeyemi"
                        className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-crimson"
                      />
                    </div>
                    <div>
                      <label htmlFor="inqBrand" className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Brand / Company
                      </label>
                      <input
                        id="inqBrand"
                        type="text"
                        value={inqBrand}
                        onChange={(e) => setInqBrand(e.target.value)}
                        placeholder="e.g. Glow Studio"
                        className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-crimson"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="inqService" className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Service Needed
                      </label>
                      <select
                        id="inqService"
                        value={inqService}
                        onChange={(e) => setInqService(e.target.value)}
                        className="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson"
                      >
                        {config.services.map((srv) => (
                          <option key={srv} value={srv}>
                            {srv}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="inqTimeline" className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        Timeline
                      </label>
                      <select
                        id="inqTimeline"
                        value={inqTimeline}
                        onChange={(e) => setInqTimeline(e.target.value)}
                        className="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-crimson"
                      >
                        <option value="ASAP / Urgent">ASAP / Urgent</option>
                        <option value="Within 2 weeks">Within 2 weeks</option>
                        <option value="This month">This month</option>
                        <option value="Ongoing retainer">Ongoing monthly retainer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="inqMessage" className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Project Brief *
                    </label>
                    <textarea
                      id="inqMessage"
                      rows={3}
                      required
                      value={inqMessage}
                      onChange={(e) => setInqMessage(e.target.value)}
                      placeholder="Tell me about your goal, deliverables, or campaign idea..."
                      className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-crimson"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-full bg-crimson hover:bg-red-600 text-xs font-bold text-white shadow-lg shadow-crimson/35 transition-colors"
                    >
                      Send Brief on WhatsApp →
                    </button>
                    <button
                      type="button"
                      onClick={handleInquiryEmail}
                      className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/15 transition-colors"
                    >
                      Send via Email
                    </button>
                  </div>
                </form>

                {/* Verified Creator Badge */}
                <div className="pt-2 space-y-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/80 bg-obsidian shrink-0">
                      <ResilientImage
                        primarySrc={config.images.heroPortrait}
                        fallbackSVG={buildStudioPortraitSVG('av2')}
                        alt={config.profile.name}
                        cloudinaryWidth={900}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-montserrat font-bold text-lg text-white">
                          {config.profile.name}
                        </span>
                        <svg className="w-5 h-5 text-[#1DA1F2]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
                        </svg>
                      </div>
                      <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/85">
                        {config.profile.currentRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-200 pt-1">
                    <a
                      href={config.profile.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-crimson transition-colors font-medium"
                    >
                      {config.profile.whatsappDisplay}
                    </a>
                    <span className="text-white/30">•</span>
                    <a
                      href={`mailto:${config.profile.email}`}
                      className="hover:text-crimson transition-colors font-medium"
                    >
                      {config.profile.email}
                    </a>
                    <span className="text-white/30">•</span>
                    <a
                      href={config.profile.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-crimson transition-colors font-medium"
                    >
                      {config.profile.instagramHandle}
                    </a>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <EditableText
                    as="p"
                    copyKey="copyrightText"
                    value={config.copy.copyrightText}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="text-xs text-zinc-300"
                  />
                  <div className="flex items-center gap-2 max-w-md">
                    <span className="block flex-1 h-1.5 rounded-full bg-gradient-to-r from-crimson via-red-400 to-white shadow-[0_0_12px_rgba(230,10,21,0.75)]" />
                    <span className="block w-2 h-2 bg-white rounded-sm" />
                  </div>
                </div>
              </div>

              {/* Right Column: Morphing Cutout Portrait + Floating QR Card */}
              <div className="lg:col-span-5 flex flex-col items-center gap-6">
                <TiltPortrait
                  id="contactPortraitCard"
                  editMode={editMode}
                  isMorphed={activeMorphKey === 'contact-portrait'}
                  onToggleMorph={() => toggleMorph('contact-portrait')}
                  className={`morph-portrait morph-portrait-bento relative w-64 h-72 sm:w-72 sm:h-80 overflow-hidden border-2 border-crimson/60 shadow-[0_0_45px_rgba(230,10,21,0.38)] ${
                    config.images.contactPortrait && config.imageLightBg?.contactPortrait
                      ? 'bg-white p-3'
                      : 'monochrome bg-[#0a0a0a]'
                  }`}
                >
                  <div className="morph-portrait-media w-full h-full">
                    <ResilientImage
                      primarySrc={config.images.contactPortrait}
                      secondarySrc={config.images.aboutPortraitFallback}
                      fallbackSVG={buildStudioPortraitSVG('contact')}
                      alt="Raymond Ajimuda Contact Portrait"
                      cloudinaryWidth={900}
                      loading="lazy"
                      decoding="async"
                      isSkeletonLoading={isInitialCloudLoading}
                      className={
                        config.images.contactPortrait && config.imageLightBg?.contactPortrait
                          ? 'w-full h-full object-contain'
                          : 'w-full h-full object-cover object-top'
                      }
                    />
                  </div>
                </TiltPortrait>

                <div className="w-60 rounded-[1.6rem] bg-gradient-to-br from-crimson via-[#ff6872] to-white p-4 text-center shadow-2xl shadow-black/50">
                  <div className="flex justify-center mb-2">
                    <svg
                      className="w-7 h-7 text-white"
                      viewBox="0 0 36 36"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                    >
                      <path d="M5 12V8a3 3 0 0 1 3-3h4" />
                      <path d="M24 5h4a3 3 0 0 1 3 3v4" />
                      <path d="M31 24v4a3 3 0 0 1-3 3h-4" />
                      <path d="M12 31H8a3 3 0 0 1-3-3v-4" />
                      <line x1="12" y1="18" x2="24" y2="18" />
                    </svg>
                  </div>
                  <a
                    href={config.profile.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mx-auto w-32 h-32 rounded-2xl bg-white p-2 shadow-md flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <ResilientImage
                      primarySrc={qrSrc}
                      fallbackSVG={buildQRCodeFallbackSVG()}
                      alt={`QR Code for ${config.profile.instagramHandle}`}
                      cloudinaryWidth={400}
                      loading="lazy"
                      decoding="async"
                      isSkeletonLoading={isInitialCloudLoading}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </a>
                  <EditableText
                    as="p"
                    copyKey="qrCaption"
                    value={config.copy.qrCaption}
                    editMode={editMode}
                    onChange={handleCopyFieldChange}
                    className="mt-2.5 text-[11px] font-extrabold text-obsidian"
                  />

                  <div className="mt-2.5 flex items-center justify-center gap-2.5">
                    <a
                      href={config.profile.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="w-8 h-8 rounded-full bg-obsidian/10 hover:bg-obsidian hover:text-white text-obsidian flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.07c-.24.69-1.41 1.32-1.95 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.26-.29.58-.36.77-.36h.56c.18 0 .42-.07.66.5.24.58.83 2.02.9 2.17.07.15.12.32.02.51-.1.2-.15.32-.29.49-.15.17-.31.38-.44.51-.15.14-.3.3-.13.59.17.29.76 1.26 1.63 2.04 1.12 1 2.07 1.31 2.36 1.46.29.14.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.71.81 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.39z" />
                      </svg>
                    </a>
                    <a
                      href={`mailto:${config.profile.email}`}
                      aria-label="Email"
                      className="w-8 h-8 rounded-full bg-obsidian/10 hover:bg-obsidian hover:text-white text-obsidian flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </a>
                    <a
                      href={config.profile.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="w-8 h-8 rounded-full bg-obsidian/10 hover:bg-obsidian hover:text-white text-obsidian flex items-center justify-center transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rolling Footer Organizations & Affiliations Marquee (Right to Left) */}
      <AffiliationsMarquee
        affiliations={config.affiliations || []}
        heading={config.copy.affiliationsHeading}
        editMode={editMode}
        isCloudLoading={isInitialCloudLoading}
        onCopyChange={handleCopyFieldChange}
      />

      {/* Universal Lightbox Modal */}
      <LightboxModal
        selection={lightboxSelection}
        config={config}
        onClose={() => setLightboxSelection(null)}
        onNavigate={(next) => setLightboxSelection(next)}
      />

      {/* Firebase Admin Email/Password Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(user) => {
          setAdminUser(user);
          setIsLoginModalOpen(false);
          setDrawerInitialTab(pendingStudioTab);
          setDrawerInitialCollection(pendingStudioCollection);
          setIsDrawerOpen(true);
          showToast(`Signed in as ${user.email || 'Admin'}`);
        }}
      />

      {/* No-Code "Edit Site" Studio Drawer (Protected by Firebase Admin Auth) */}
      <StudioEditorDrawer
        isOpen={isDrawerOpen && Boolean(adminUser)}
        initialTab={drawerInitialTab}
        initialCollection={drawerInitialCollection}
        onClose={() => setIsDrawerOpen(false)}
        config={config}
        onUpdateConfig={updateConfig}
        editMode={editMode}
        onToggleEditMode={() => {
          if (!adminUser) {
            setIsLoginModalOpen(true);
            return;
          }
          setEditMode((v) => {
            const next = !v;
            showToast(next ? 'On-page click-to-edit enabled!' : 'On-page editing disabled');
            return next;
          });
        }}
        cloudState={cloudState}
        storageStatus={storageStatus}
        onSaveNow={handleSaveNow}
        onDownloadHtml={handleDownloadStandaloneHtml}
        onResetAll={handleResetAll}
        showToast={showToast}
        adminUser={adminUser}
        onAdminSignOut={handleAdminSignOut}
      />

      {/* Toast Message */}
      <div
        id="toastMessage"
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none transition-all duration-300 px-5 py-2.5 rounded-full bg-crimson text-white text-xs sm:text-sm font-semibold shadow-2xl shadow-crimson/50 border border-white/25 whitespace-nowrap ${
          toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {toastText}
      </div>
    </div>
  );
}
