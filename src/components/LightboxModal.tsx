import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  LightboxSectionType,
  LightboxSelection,
  PortfolioConfig,
  ProjectItem,
  VideoReelItem,
} from '../types/portfolio';
import { drawReelFrame } from '../utils/reelCanvas';
import { buildProjectArtworkSVG } from '../utils/svgArtwork';
import {
  deriveCloudinaryVideoPoster,
  isVideoUrl,
  normalizeCloudinaryVideoUrl,
  optimizeCloudinaryUrl,
} from '../services/portfolioCloud';
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

const AUTO_SWIPE_IMAGE_MS = 4000;
const AUTO_SWIPE_VIDEO_MS = 8500;

export function LightboxModal({
  selection,
  config,
  onClose,
  onNavigate,
}: LightboxModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const list: Array<ProjectItem | VideoReelItem> = useMemo(() => {
    if (!selection) return [];
    const raw =
      selection.sectionType === 'identity'
        ? config.identityProjects
        : selection.sectionType === 'flyers'
          ? config.flyerProjects
          : selection.sectionType === 'videos'
            ? config.videoReels
            : config.photoProjects;
    return raw.filter((item) => !item.hidden);
  }, [selection, config]);

  const activeIndex = selection ? list.findIndex((item) => item.id === selection.projectId) : -1;
  const activeItem = activeIndex >= 0 ? list[activeIndex] : null;
  const isVideoSection = selection?.sectionType === 'videos';
  const activeReel = isVideoSection && activeItem ? (activeItem as VideoReelItem) : null;
  const activeProject = !isVideoSection && activeItem ? (activeItem as ProjectItem) : null;

  // Build full list of media slides for the active tile
  const slides = useMemo(() => {
    if (!activeItem) return [];
    const out: string[] = [];
    if (activeReel) {
      const primary = activeReel.videoUrl
        ? normalizeCloudinaryVideoUrl(activeReel.videoUrl)
        : activeReel.gifUrl;
      if (primary) out.push(primary);
    } else if (activeProject?.image) {
      out.push(activeProject.image);
    }
    if (Array.isArray(activeItem.gallery)) {
      activeItem.gallery.forEach((u) => {
        if (!u) return;
        const normalized = isVideoUrl(u) ? normalizeCloudinaryVideoUrl(u) : u;
        if (!out.includes(normalized)) out.push(normalized);
      });
    }
    return out;
  }, [activeItem, activeReel, activeProject]);

  const hasCarousel = slides.length > 1;
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isAutoSwiping, setIsAutoSwiping] = useState<boolean>(true);
  const [isStageHovered, setIsStageHovered] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);

  // Reset slide index & resume timed auto-swipe whenever a new tile is opened
  useEffect(() => {
    setActiveSlide(0);
    setIsAutoSwiping(true);
    setDragOffset(0);
  }, [activeItem?.id]);

  // Timed auto-swipe inside Lightbox when a tile has multiple media slides
  useEffect(() => {
    if (!selection || !hasCarousel || !isAutoSwiping || isStageHovered || dragOffset !== 0) return;
    const currentUrl = slides[activeSlide];
    const delayMs = isVideoUrl(currentUrl) ? AUTO_SWIPE_VIDEO_MS : AUTO_SWIPE_IMAGE_MS;
    const timer = window.setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [selection, hasCarousel, isAutoSwiping, isStageHovered, dragOffset, activeSlide, slides]);

  const goSlide = (delta: number) => {
    if (slides.length <= 1) return;
    setActiveSlide((prev) => (prev + delta + slides.length) % slides.length);
  };

  useEffect(() => {
    if (!selection) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        if (slides.length > 1) {
          setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
        } else if (list.length > 1) {
          const prevIdx = (activeIndex - 1 + list.length) % list.length;
          onNavigate({ sectionType: selection.sectionType, projectId: list[prevIdx].id });
        }
      }
      if (e.key === 'ArrowRight') {
        if (slides.length > 1) {
          setActiveSlide((prev) => (prev + 1) % slides.length);
        } else if (list.length > 1) {
          const nextIdx = (activeIndex + 1) % list.length;
          onNavigate({ sectionType: selection.sectionType, projectId: list[nextIdx].id });
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selection, activeIndex, list, slides.length, onClose, onNavigate]);

  useEffect(() => {
    if (!activeReel || activeReel.videoUrl || activeReel.gifUrl || slides.length > 0) return;
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
  }, [activeReel, slides.length]);

  if (!selection || !activeItem) return null;

  const waHref = `${config.profile.whatsappUrl}?text=${encodeURIComponent(
    `Hello ${config.profile.name}, I loved your "${activeItem.client} — ${activeItem.title}" project on your portfolio and would love to discuss something similar!`
  )}`;

  const handlePrevProject = () => {
    if (list.length <= 1) return;
    const prevIdx = (activeIndex - 1 + list.length) % list.length;
    onNavigate({ sectionType: selection.sectionType, projectId: list[prevIdx].id });
  };

  const handleNextProject = () => {
    if (list.length <= 1) return;
    const nextIdx = (activeIndex + 1) % list.length;
    onNavigate({ sectionType: selection.sectionType, projectId: list[nextIdx].id });
  };

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasCarousel) return;
    if ((e.target as HTMLElement).closest('button, video')) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, active: true };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasCarousel || !dragStartRef.current.active) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      setDragOffset(Math.max(-140, Math.min(140, dx)));
    }
  };

  const finishStageSwipe = (endX: number) => {
    if (!dragStartRef.current.active) return;
    const dx = endX - dragStartRef.current.x;
    dragStartRef.current.active = false;
    setDragOffset(0);
    if (Math.abs(dx) >= 40) {
      goSlide(dx < 0 ? 1 : -1);
    }
  };

  const useLightBg = Boolean(
    (activeProject?.image && activeProject?.lightBg) ||
      (activeReel && !activeReel.videoUrl && activeReel.gifUrl && activeReel.lightBg)
  );

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
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-obsidian/85 hover:bg-crimson text-white border border-white/15 flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Left Media / Carousel Stage */}
          <div className="md:col-span-6 bg-obsidian p-5 flex flex-col items-center justify-center gap-3">
            <div
              onPointerDown={handleStagePointerDown}
              onPointerMove={handleStagePointerMove}
              onPointerUp={(e) => finishStageSwipe(e.clientX)}
              onPointerCancel={() => {
                dragStartRef.current.active = false;
                setDragOffset(0);
              }}
              onPointerEnter={(e) => {
                if (e.pointerType !== 'touch') setIsStageHovered(true);
              }}
              onPointerLeave={(e) => {
                if (e.pointerType !== 'touch') setIsStageHovered(false);
                if (dragStartRef.current.active) finishStageSwipe(e.clientX);
              }}
              className={`relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl border border-white/10 touch-pan-y select-none ${
                hasCarousel ? 'cursor-grab active:cursor-grabbing' : ''
              } ${
                useLightBg && !hasCarousel
                  ? 'bg-white p-5 flex items-center justify-center'
                  : 'bg-obsidian'
              }`}
            >
              {hasCarousel ? (
                <>
                  <div
                    className={`flex w-full h-full ${
                      dragOffset === 0 ? 'transition-transform duration-500 ease-out' : ''
                    }`}
                    style={{
                      transform: `translate3d(calc(-${activeSlide * 100}% + ${dragOffset}px), 0, 0)`,
                    }}
                  >
                    {slides.map((src, idx) => {
                      const slideIsVideo = isVideoUrl(src);
                      const isActive = idx === activeSlide;
                      const poster =
                        idx === 0 && activeReel?.posterUrl
                          ? activeReel.posterUrl
                          : slideIsVideo
                            ? deriveCloudinaryVideoPoster(src)
                            : undefined;
                      return (
                        <div
                          key={`${activeItem.id}-lb-slide-${idx}`}
                          className={`w-full h-full shrink-0 flex items-center justify-center ${
                            useLightBg && !slideIsVideo ? 'bg-white p-5' : 'bg-obsidian'
                          }`}
                        >
                          {slideIsVideo ? (
                            <video
                              key={`${src}-${isActive ? 'active' : 'idle'}`}
                              src={normalizeCloudinaryVideoUrl(src)}
                              poster={poster}
                              controls
                              autoPlay={isActive}
                              loop
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={src}
                              alt={`${activeItem.client} — ${activeItem.title} (Slide ${idx + 1})`}
                              referrerPolicy="no-referrer"
                              draggable={false}
                              className={
                                useLightBg
                                  ? 'w-full h-full object-contain'
                                  : 'w-full h-full object-cover object-top'
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Top Carousel Status & Auto-Swipe Toggle */}
                  <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-none">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAutoSwiping((v) => !v);
                      }}
                      className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-obsidian/80 hover:bg-crimson backdrop-blur-md border border-white/20 text-[10px] font-montserrat font-bold text-white transition-colors"
                      title={isAutoSwiping ? 'Pause auto-swipe' : 'Resume auto-swipe'}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isAutoSwiping && !isStageHovered ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                        }`}
                      />
                      <span>{isAutoSwiping ? 'Auto-Swipe ON' : 'Paused'}</span>
                    </button>

                    <span className="px-2.5 py-1 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white">
                      {activeSlide + 1} / {slides.length}
                    </span>
                  </div>

                  {/* Manual Carousel Prev / Next Arrows */}
                  <button
                    type="button"
                    aria-label="Previous media slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      goSlide(-1);
                    }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-obsidian/80 hover:bg-crimson text-white border border-white/20 flex items-center justify-center text-lg font-bold transition-colors shadow-lg"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="Next media slide"
                    onClick={(e) => {
                      e.stopPropagation();
                      goSlide(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-obsidian/80 hover:bg-crimson text-white border border-white/20 flex items-center justify-center text-lg font-bold transition-colors shadow-lg"
                  >
                    ›
                  </button>

                  {/* Bottom Swipe Hint & Dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/15">
                    {slides.map((_, idx) => (
                      <button
                        key={`${activeItem.id}-lb-dot-${idx}`}
                        type="button"
                        aria-label={`View slide ${idx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSlide(idx);
                        }}
                        className={`h-2 rounded-full transition-all ${
                          idx === activeSlide
                            ? 'w-5 bg-crimson'
                            : 'w-2 bg-white/40 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : activeReel ? (
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

            {/* Thumbnail Strip for Multi-Media Carousels */}
            {hasCarousel && (
              <div className="w-full space-y-1.5">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {slides.map((src, idx) => {
                    const slideIsVideo = isVideoUrl(src);
                    const thumbSrc = slideIsVideo
                      ? deriveCloudinaryVideoPoster(src) || ''
                      : optimizeCloudinaryUrl(src, 200) || src;
                    return (
                      <button
                        key={`${activeItem.id}-thumb-${idx}`}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                          idx === activeSlide
                            ? 'border-crimson scale-105 shadow-md shadow-crimson/40'
                            : 'border-white/15 opacity-60 hover:opacity-100'
                        }`}
                        aria-label={`Select slide ${idx + 1}`}
                      >
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-400">
                            {idx + 1}
                          </div>
                        )}
                        {slideIsVideo && (
                          <span className="absolute inset-0 bg-black/35 flex items-center justify-center text-[10px] text-white">
                            ▶
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10.5px] text-zinc-400 text-center">
                  Swipe left/right or tap thumbnails to browse slides
                </p>
              </div>
            )}
          </div>

          {/* Right Project Details */}
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
                onClick={handlePrevProject}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-crimson text-xs font-semibold text-white transition-colors"
              >
                ← Previous
              </button>
              <span className="text-[11px] font-mono text-zinc-400">
                {activeIndex + 1} / {list.length}
              </span>
              <button
                type="button"
                onClick={handleNextProject}
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
