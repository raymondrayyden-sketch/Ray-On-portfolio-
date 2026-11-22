import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectItem } from '../types/portfolio';
import { buildProjectArtworkSVG } from '../utils/svgArtwork';
import {
  deriveCloudinaryVideoPoster,
  isVideoUrl,
  normalizeCloudinaryVideoUrl,
} from '../services/portfolioCloud';
import { ResilientImage } from './ResilientImage';

interface ProjectTileProps {
  project: ProjectItem;
  isTouchMorphed: boolean;
  isCloudLoading?: boolean;
  onTouchMorph: (id: string) => void;
  onOpenLightbox: (id: string) => void;
}

export function ProjectTile({
  project,
  isTouchMorphed,
  isCloudLoading = false,
  onTouchMorph,
  onOpenLightbox,
}: ProjectTileProps) {
  const lastPointerTypeRef = useRef<string>('mouse');
  const dragStartRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const didSwipeRef = useRef<boolean>(false);

  const slides = useMemo(() => {
    const list: string[] = [];
    if (project.image) list.push(project.image);
    if (Array.isArray(project.gallery)) {
      project.gallery.forEach((url) => {
        if (url && !list.includes(url)) list.push(url);
      });
    }
    return list;
  }, [project.image, project.gallery]);

  const hasCarousel = !isCloudLoading && slides.length > 1;
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<number>(0);

  useEffect(() => {
    if (activeSlide >= slides.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, slides.length]);

  // Subtle timed auto-swipe on multi-media tiles (pauses on hover/touch-morph/drag)
  useEffect(() => {
    if (!hasCarousel || isHovered || isTouchMorphed || dragOffset !== 0) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [hasCarousel, isHovered, isTouchMorphed, dragOffset, slides.length]);

  const goSlide = (delta: number) => {
    if (slides.length <= 1) return;
    setActiveSlide((prev) => (prev + delta + slides.length) % slides.length);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    lastPointerTypeRef.current = e.pointerType || 'mouse';
    didSwipeRef.current = false;
    if (!hasCarousel) return;
    if ((e.target as HTMLElement).closest('[data-carousel-control="true"]')) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, active: true };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!hasCarousel || !dragStartRef.current.active) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      setDragOffset(Math.max(-90, Math.min(90, dx)));
    }
  };

  const finishSwipe = (endX: number) => {
    if (!dragStartRef.current.active) return;
    const dx = endX - dragStartRef.current.x;
    dragStartRef.current.active = false;
    setDragOffset(0);
    if (Math.abs(dx) >= 36) {
      didSwipeRef.current = true;
      goSlide(dx < 0 ? 1 : -1);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    finishSwipe(e.clientX);
  };

  const handlePointerCancel = () => {
    dragStartRef.current.active = false;
    setDragOffset(0);
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest('[data-carousel-control="true"]')) {
      return;
    }
    const clickedOpenBtn = Boolean((e.target as HTMLElement).closest('[data-open-lightbox="true"]'));
    if (lastPointerTypeRef.current === 'touch' && !isTouchMorphed && !clickedOpenBtn) {
      onTouchMorph(project.id);
      return;
    }
    onOpenLightbox(project.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenLightbox(project.id);
    }
  };

  const useLightBg = Boolean(!isCloudLoading && project.image && project.lightBg);

  return (
    <article
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setIsHovered(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') setIsHovered(false);
        if (dragStartRef.current.active) finishSwipe(e.clientX);
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group portfolio-tile relative aspect-square overflow-hidden border border-white/20 shadow-lg touch-pan-y select-none ${
        useLightBg ? 'bg-white' : 'bg-obsidian'
      } ${isTouchMorphed ? 'is-morphed' : ''}`}
    >
      <div className="tile-art w-full h-full overflow-hidden">
        {hasCarousel ? (
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
              return (
                <div
                  key={`${project.id}-slide-${idx}`}
                  className={`w-full h-full shrink-0 ${
                    useLightBg && !slideIsVideo ? 'p-5 flex items-center justify-center' : ''
                  }`}
                >
                  {slideIsVideo ? (
                    <video
                      src={normalizeCloudinaryVideoUrl(src)}
                      poster={deriveCloudinaryVideoPoster(src)}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <ResilientImage
                      primarySrc={src}
                      secondarySrc={idx === 0 ? project.fallbackImage : null}
                      fallbackSVG={buildProjectArtworkSVG(project.artKey, project.client)}
                      alt={`${project.client} — ${project.title} (${idx + 1}/${slides.length})`}
                      cloudinaryWidth={700}
                      loading="lazy"
                      decoding="async"
                      isSkeletonLoading={isCloudLoading}
                      className={
                        useLightBg
                          ? 'w-full h-full object-contain pointer-events-none'
                          : 'w-full h-full object-cover object-top pointer-events-none'
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`w-full h-full ${useLightBg ? 'p-5 flex items-center justify-center' : ''}`}>
            <ResilientImage
              primarySrc={project.image}
              secondarySrc={project.fallbackImage}
              fallbackSVG={buildProjectArtworkSVG(project.artKey, project.client)}
              alt={`${project.client} — ${project.title}`}
              cloudinaryWidth={700}
              loading="lazy"
              decoding="async"
              isSkeletonLoading={isCloudLoading}
              className={useLightBg ? 'w-full h-full object-contain' : 'w-full h-full object-cover object-top'}
            />
          </div>
        )}
      </div>

      {/* Multi-Media Carousel HUD */}
      {hasCarousel && (
        <>
          <div className="pointer-events-none absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/20 text-[9.5px] font-montserrat font-bold text-white shadow-md">
            <svg className="w-3 h-3 text-crimson" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
              <rect x="3" y="5" width="14" height="14" rx="2" />
              <path d="M9 3h10a2 2 0 0 1 2 2v10" />
            </svg>
            <span>
              {activeSlide + 1}/{slides.length}
            </span>
          </div>

          <button
            type="button"
            data-carousel-control="true"
            aria-label="Previous slide"
            onClick={(e) => {
              e.stopPropagation();
              goSlide(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-obsidian/80 hover:bg-crimson text-white border border-white/20 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shadow-md"
          >
            ‹
          </button>
          <button
            type="button"
            data-carousel-control="true"
            aria-label="Next slide"
            onClick={(e) => {
              e.stopPropagation();
              goSlide(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-obsidian/80 hover:bg-crimson text-white border border-white/20 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all shadow-md"
          >
            ›
          </button>

          <div
            data-carousel-control="true"
            className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-obsidian/70 backdrop-blur-md border border-white/15"
          >
            {slides.map((_, idx) => (
              <button
                key={`${project.id}-dot-${idx}`}
                type="button"
                data-carousel-control="true"
                aria-label={`Go to slide ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlide(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeSlide ? 'w-4 bg-crimson' : 'w-1.5 bg-white/45 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}

      <div className="tile-overlay absolute inset-x-2.5 bottom-2.5 rounded-2xl bg-obsidian/88 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2 z-20">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-crimson">
            {project.category}
          </span>
          <h3 className="font-montserrat text-xs sm:text-sm font-extrabold text-white truncate">
            {project.client}
          </h3>
          <p className="text-[11px] text-zinc-300 truncate">{project.title}</p>
        </div>
        <span
          data-open-lightbox="true"
          className="shrink-0 px-2.5 py-1.5 rounded-full bg-crimson text-[10px] font-bold text-white whitespace-nowrap"
        >
          View →
        </span>
      </div>
    </article>
  );
}
