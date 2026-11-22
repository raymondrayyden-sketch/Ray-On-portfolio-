import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { VideoReelItem } from '../types/portfolio';
import { drawReelFrame } from '../utils/reelCanvas';
import {
  deriveCloudinaryVideoPoster,
  isVideoUrl,
  normalizeCloudinaryVideoUrl,
  optimizeCloudinaryUrl,
} from '../services/portfolioCloud';

interface VideoReelCardProps {
  reel: VideoReelItem;
  isTouchMorphed: boolean;
  isCloudLoading?: boolean;
  onTouchMorph: (id: string) => void;
  onOpenLightbox: (id: string) => void;
}

export function VideoReelCard({
  reel,
  isTouchMorphed,
  isCloudLoading = false,
  onTouchMorph,
  onOpenLightbox,
}: VideoReelCardProps) {
  const [isHoverPlaying, setIsHoverPlaying] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const hasPlayedRef = useRef<boolean>(false);
  const lastPointerTypeRef = useRef<string>('mouse');
  const dragStartRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const didSwipeRef = useRef<boolean>(false);

  const isPlaying = isHoverPlaying || isTouchMorphed;
  const resolvedVideoUrl = reel.videoUrl ? normalizeCloudinaryVideoUrl(reel.videoUrl) : null;
  const rawPosterUrl =
    reel.posterUrl || (resolvedVideoUrl ? deriveCloudinaryVideoPoster(resolvedVideoUrl) : undefined);
  const resolvedPosterUrl = rawPosterUrl ? optimizeCloudinaryUrl(rawPosterUrl, 700) || rawPosterUrl : undefined;
  const resolvedGifUrl = reel.gifUrl ? optimizeCloudinaryUrl(reel.gifUrl, 700) || reel.gifUrl : null;

  const slides = useMemo(() => {
    const primary = resolvedVideoUrl || resolvedGifUrl;
    const list: string[] = [];
    if (primary) list.push(primary);
    if (Array.isArray(reel.gallery)) {
      reel.gallery.forEach((url) => {
        if (!url) return;
        const normalized = isVideoUrl(url) ? normalizeCloudinaryVideoUrl(url) : url;
        if (!list.includes(normalized)) list.push(normalized);
      });
    }
    return list;
  }, [resolvedVideoUrl, resolvedGifUrl, reel.gallery]);

  const hasCarousel = !isCloudLoading && slides.length > 1;

  useEffect(() => {
    if (activeSlide >= slides.length) {
      setActiveSlide(0);
    }
  }, [activeSlide, slides.length]);

  // Subtle timed auto-swipe when tile is idle and has multiple slides
  useEffect(() => {
    if (!hasCarousel || isPlaying || dragOffset !== 0) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [hasCarousel, isPlaying, dragOffset, slides.length]);

  useEffect(() => {
    // Control playback on the active video element and pause inactive slides
    videoRefs.current.forEach((videoEl, idx) => {
      if (!videoEl) return;
      if (isPlaying && idx === activeSlide) {
        hasPlayedRef.current = true;
        try {
          if (videoEl.readyState >= 1) {
            videoEl.currentTime = 0;
          }
        } catch {
          // ignore seek error before metadata loads
        }
        videoEl.play().catch(() => {});
      } else if (hasPlayedRef.current || idx !== activeSlide) {
        videoEl.pause();
        try {
          if (videoEl.readyState >= 1) {
            videoEl.currentTime = 0;
          }
        } catch {
          // ignore seek error
        }
      }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (isPlaying && !resolvedVideoUrl && !reel.gifUrl) {
      const startTime = performance.now();
      const loop = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        drawReelFrame(canvas, reel.motionType, reel.client, reel.title, elapsed);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else if (!resolvedVideoUrl && (!reel.gifUrl || !reel.posterUrl)) {
      drawReelFrame(canvas, reel.motionType, reel.client, reel.title, 0);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    isPlaying,
    activeSlide,
    reel.motionType,
    reel.client,
    reel.title,
    resolvedVideoUrl,
    reel.gifUrl,
    reel.posterUrl,
  ]);

  useEffect(() => {
    const onResize = () => {
      if (!isPlaying && canvasRef.current) {
        drawReelFrame(canvasRef.current, reel.motionType, reel.client, reel.title, 0);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isPlaying, reel.motionType, reel.client, reel.title]);

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

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest('[data-carousel-control="true"]')) {
      return;
    }
    const clickedExpandPill = Boolean((e.target as HTMLElement).closest('[data-open-lightbox="true"]'));
    if (lastPointerTypeRef.current === 'touch' && !isTouchMorphed && !clickedExpandPill) {
      onTouchMorph(reel.id);
      return;
    }
    onOpenLightbox(reel.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenLightbox(reel.id);
    }
  };

  const useLightBg = Boolean(!isCloudLoading && reel.lightBg && !resolvedVideoUrl && (resolvedGifUrl || resolvedPosterUrl));

  return (
    <article
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishSwipe(e.clientX)}
      onPointerCancel={() => {
        dragStartRef.current.active = false;
        setDragOffset(0);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setIsHoverPlaying(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') setIsHoverPlaying(false);
        if (dragStartRef.current.active) finishSwipe(e.clientX);
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group portfolio-tile reel-tile relative aspect-[4/5] overflow-hidden border border-white/15 shadow-xl touch-pan-y select-none ${
        useLightBg ? 'bg-white' : 'bg-obsidian'
      } ${isPlaying ? 'is-playing' : ''} ${isTouchMorphed ? 'is-morphed' : ''}`}
    >
      <div className={`tile-art relative w-full h-full overflow-hidden ${useLightBg && !hasCarousel ? 'p-4 flex items-center justify-center' : ''}`}>
        {isCloudLoading ? (
          <div className="w-full h-full bg-zinc-900 animate-pulse" aria-hidden="true" />
        ) : hasCarousel ? (
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
              const poster =
                idx === 0 && resolvedPosterUrl
                  ? resolvedPosterUrl
                  : slideIsVideo
                    ? deriveCloudinaryVideoPoster(src)
                    : undefined;
              const imgSrc = !slideIsVideo ? optimizeCloudinaryUrl(src, 700) || src : src;
              return (
                <div key={`${reel.id}-slide-${idx}`} className="w-full h-full shrink-0">
                  {slideIsVideo ? (
                    <video
                      ref={(el) => {
                        videoRefs.current[idx] = el;
                      }}
                      src={normalizeCloudinaryVideoUrl(src)}
                      poster={poster || undefined}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <img
                      src={imgSrc}
                      alt={`${reel.title} (${idx + 1}/${slides.length})`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : resolvedVideoUrl ? (
          <video
            key={resolvedVideoUrl}
            ref={(el) => {
              videoRefs.current[0] = el;
            }}
            src={resolvedVideoUrl}
            poster={resolvedPosterUrl || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : resolvedGifUrl ? (
          <>
            {!resolvedPosterUrl && !useLightBg && <canvas ref={canvasRef} className="w-full h-full block" />}
            <img
              src={isPlaying ? resolvedGifUrl : resolvedPosterUrl || resolvedGifUrl}
              alt={reel.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className={
                useLightBg
                  ? 'w-full h-full object-contain'
                  : resolvedPosterUrl
                    ? 'w-full h-full object-cover'
                    : `absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
                        isPlaying ? 'opacity-100' : 'opacity-0'
                      }`
              }
            />
          </>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full block" />
        )}
      </div>

      {/* Top HUD */}
      <div className="pointer-events-none absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
        <div className="relative">
          <span className="reel-idle-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/20 text-[9.5px] font-montserrat font-bold tracking-wider uppercase text-white transition-all">
            <span className="w-2 h-2 rounded-full bg-crimson" />
            {reel.videoUrl ? 'VIDEO • HOVER TO PLAY' : 'GIF • HOVER TO PLAY'}
          </span>
          <span className="reel-playing-badge absolute top-0 left-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-crimson text-[9.5px] font-montserrat font-bold tracking-wider uppercase text-white shadow-lg whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            PLAYING
          </span>
        </div>
        <div className="flex items-center gap-1.5 max-w-[52%]">
          {hasCarousel && (
            <span className="px-2 py-1 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/20 text-[9.5px] font-montserrat font-bold text-white shrink-0">
              {activeSlide + 1}/{slides.length}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-obsidian/75 backdrop-blur-md border border-crimson/45 text-[9.5px] font-bold text-zinc-100 truncate">
            {reel.toolTag}
          </span>
        </div>
      </div>

      {/* Carousel Controls when Reel has multiple slides */}
      {hasCarousel && (
        <>
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
            className="absolute bottom-[82px] left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-obsidian/75 backdrop-blur-md border border-white/15"
          >
            {slides.map((_, idx) => (
              <button
                key={`${reel.id}-dot-${idx}`}
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

      {/* Bottom Overlay */}
      <div className="tile-overlay absolute inset-x-2.5 bottom-2.5 rounded-2xl bg-obsidian/90 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2 z-20">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-crimson">
            {reel.category} • {reel.duration}
          </span>
          <h3 className="font-montserrat text-xs sm:text-sm font-extrabold text-white truncate">
            {reel.client}
          </h3>
          <p className="text-[11px] text-zinc-300 truncate">{reel.title}</p>
        </div>
        <span
          data-open-lightbox="true"
          className="shrink-0 px-2.5 py-1.5 rounded-full bg-crimson text-[10px] font-bold text-white whitespace-nowrap"
        >
          Expand →
        </span>
      </div>
    </article>
  );
}
