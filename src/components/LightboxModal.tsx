import { useEffect, useRef } from 'react';
import type {
  LightboxSectionType,
  LightboxSelection,
  PortfolioConfig,
  ProjectItem,
  VideoReelItem,
} from '../types/portfolio';
import { drawReelFrame } from '../utils/reelCanvas';
import { buildProjectArtworkSVG } from '../utils/svgArtwork';
import { deriveCloudinaryVideoPoster, normalizeCloudinaryVideoUrl } from '../services/portfolioCloud';
import { ResilientImage } from './ResilientImage';

interface LightboxModalProps {
  selection: LightboxSelection | null;
  config: PortfolioConfig;
  onClose: () => void;
  onNavigate: (next: LightboxSelection) => void;
}

const SECTION_LABELS: Record<LightboxSectionType, string> = {
  identity: 'Brand & Social Media',
  flyers: 'Campaign Flyer',
  videos: 'Motion & Video Reel',
  photos: 'Photography & Retouching',
};

export function LightboxModal({
  selection,
  config,
  onClose,
  onNavigate,
}: LightboxModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const list: Array<ProjectItem | VideoReelItem> = !selection
    ? []
    : selection.sectionType === 'identity'
    ? config.identityProjects
    : selection.sectionType === 'flyers'
    ? config.flyerProjects
    : selection.sectionType === 'videos'
    ? config.videoReels
    : config.photoProjects;

  const activeIndex = selection ? list.findIndex((item) => item.id === selection.projectId) : -1;
  const activeItem = activeIndex >= 0 ? list[activeIndex] : null;
  const isVideo = selection?.sectionType === 'videos';
  const activeReel = isVideo && activeItem ? (activeItem as VideoReelItem) : null;
  const activeProject = !isVideo && activeItem ? (activeItem as ProjectItem) : null;

  useEffect(() => {
    if (!selection) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && list.length > 1) {
        const prevIdx = (activeIndex - 1 + list.length) % list.length;
        onNavigate({ sectionType: selection.sectionType, projectId: list[prevIdx].id });
      }
      if (e.key === 'ArrowRight' && list.length > 1) {
        const nextIdx = (activeIndex + 1) % list.length;
        onNavigate({ sectionType: selection.sectionType, projectId: list[nextIdx].id });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selection, activeIndex, list, onClose, onNavigate]);

  useEffect(() => {
    if (!activeReel || activeReel.videoUrl || activeReel.gifUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId = 0;
    const startTime = performance.now();
    const loop = (now: number) => {
      drawReelFrame(canvas, activeReel.motionType, activeReel.client, activeReel.title, (now - startTime) / 1000);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [activeReel]);

  if (!selection || !activeItem) return null;

  const waHref = `${config.profile.whatsappUrl}?text=${encodeURIComponent(
    `Hello ${config.profile.name}, I loved your "${activeItem.client} — ${activeItem.title}" project on your portfolio and would love to discuss something similar!`
  )}`;

  const handlePrev = () => {
    if (list.length <= 1) return;
    const prevIdx = (activeIndex - 1 + list.length) % list.length;
    onNavigate({ sectionType: selection.sectionType, projectId: list[prevIdx].id });
  };

  const handleNext = () => {
    if (list.length <= 1) return;
    const nextIdx = (activeIndex + 1) % list.length;
    onNavigate({ sectionType: selection.sectionType, projectId: list[nextIdx].id });
  };

  return (
    <div
      id="lightboxModal"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/88 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] bg-[#120607] border border-crimson/55 shadow-[0_0_68px_rgba(230,10,21,0.42)]"
      >
        <button
          id="closeLightboxBtn"
          type="button"
          onClick={onClose}
          aria-label="Close Preview"
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-obsidian/85 hover:bg-crimson text-white border border-white/15 flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-6 bg-obsidian p-5 flex items-center justify-center">
            <div
              className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl border border-white/10 ${
                (activeProject?.image && activeProject?.lightBg) ||
                (activeReel && !activeReel.videoUrl && activeReel.gifUrl && activeReel.lightBg)
                  ? 'bg-white p-5 flex items-center justify-center'
                  : 'bg-obsidian'
              }`}
            >
              {activeReel ? (
                activeReel.videoUrl ? (
                  <video
                    key={normalizeCloudinaryVideoUrl(activeReel.videoUrl)}
                    src={normalizeCloudinaryVideoUrl(activeReel.videoUrl)}
                    poster={activeReel.posterUrl || deriveCloudinaryVideoPoster(activeReel.videoUrl)}
                    controls
                    autoPlay
                    loop
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                ) : activeReel.gifUrl ? (
                  <img
                    src={activeReel.gifUrl}
                    alt={activeReel.title}
                    referrerPolicy="no-referrer"
                    className={
                      activeReel.lightBg ? 'w-full h-full object-contain' : 'w-full h-full object-cover'
                    }
                  />
                ) : (
                  <canvas ref={canvasRef} className="w-full h-full block" />
                )
              ) : activeProject ? (
                <ResilientImage
                  primarySrc={activeProject.image}
                  secondarySrc={activeProject.fallbackImage}
                  fallbackSVG={buildProjectArtworkSVG(activeProject.artKey, activeProject.client)}
                  alt={`${activeProject.client} — ${activeProject.title}`}
                  className={
                    activeProject.image && activeProject.lightBg
                      ? 'w-full h-full object-contain'
                      : 'w-full h-full object-cover object-top'
                  }
                />
              ) : null}
            </div>
          </div>

          <div className="md:col-span-6 p-6 sm:p-7 flex flex-col justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <span className="px-3 py-1 rounded-full bg-crimson/20 border border-crimson/50 text-[11px] font-bold uppercase tracking-wider text-crimson">
                  {activeItem.category}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-zinc-300">
                  {SECTION_LABELS[selection.sectionType]}
                </span>
              </div>

              <h3 className="mt-3 font-syne text-2xl sm:text-3xl font-extrabold text-white">
                {activeItem.client}
              </h3>
              <p className="text-sm font-semibold text-crimson/90 mt-0.5">{activeItem.title}</p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">{activeItem.summary}</p>

              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-montserrat font-bold tracking-widest uppercase text-zinc-400">
                  Role / Tools &amp; Deliverables
                </p>
                <p className="text-xs font-semibold text-white">
                  {activeReel ? `${activeReel.role} • ${activeReel.toolTag} (${activeReel.duration})` : activeItem.role}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeItem.deliverables.map((d, idx) => (
                    <span
                      key={`${d}-${idx}`}
                      className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10.5px] font-medium text-zinc-200"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 w-full btn-crimson-pill inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-xs font-montserrat font-extrabold tracking-wide text-obsidian shadow-lg shadow-crimson/35"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.07c-.24.69-1.41 1.32-1.95 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.02-2.42.26-.29.58-.36.77-.36h.56c.18 0 .42-.07.66.5.24.58.83 2.02.9 2.17.07.15.12.32.02.51-.1.2-.15.32-.29.49-.15.17-.31.38-.44.51-.15.14-.3.3-.13.59.17.29.76 1.26 1.63 2.04 1.12 1 2.07 1.31 2.36 1.46.29.14.46.12.63-.07.17-.2.73-.85.92-1.14.2-.29.39-.24.66-.15.27.1 1.71.81 2 .95.29.15.49.22.56.34.07.12.07.7-.17 1.39z" />
                </svg>
                <span>Start a Similar Project on WhatsApp</span>
              </a>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-crimson text-xs font-semibold text-white transition-colors"
              >
                ← Previous
              </button>
              <span className="text-[11px] font-mono text-zinc-400">
                {activeIndex + 1} / {list.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-crimson text-xs font-semibold text-white transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
