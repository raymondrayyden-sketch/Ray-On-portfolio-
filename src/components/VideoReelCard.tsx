import React, { useEffect, useRef, useState } from 'react';
import type { VideoReelItem } from '../types/portfolio';
import { drawReelFrame } from '../utils/reelCanvas';
import { deriveCloudinaryVideoPoster, normalizeCloudinaryVideoUrl } from '../services/portfolioCloud';

interface VideoReelCardProps {
  reel: VideoReelItem;
  isTouchMorphed: boolean;
  onTouchMorph: (id: string) => void;
  onOpenLightbox: (id: string) => void;
}

export function VideoReelCard({
  reel,
  isTouchMorphed,
  onTouchMorph,
  onOpenLightbox,
}: VideoReelCardProps) {
  const [isHoverPlaying, setIsHoverPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasPlayedRef = useRef<boolean>(false);
  const lastPointerTypeRef = useRef<string>('mouse');

  const isPlaying = isHoverPlaying || isTouchMorphed;
  const resolvedVideoUrl = reel.videoUrl ? normalizeCloudinaryVideoUrl(reel.videoUrl) : null;
  const resolvedPosterUrl =
    reel.posterUrl || (resolvedVideoUrl ? deriveCloudinaryVideoPoster(resolvedVideoUrl) : undefined);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) {
      if (isPlaying) {
        hasPlayedRef.current = true;
        try {
          if (videoEl.readyState >= 1) {
            videoEl.currentTime = 0;
          }
        } catch {
          // ignore seek error before metadata loads
        }
        videoEl.play().catch(() => {});
      } else if (hasPlayedRef.current) {
        videoEl.pause();
        try {
          if (videoEl.readyState >= 1) {
            videoEl.currentTime = 0;
          }
        } catch {
          // ignore seek error
        }
      }
    }

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
  }, [isPlaying, reel.motionType, reel.client, reel.title, resolvedVideoUrl, reel.gifUrl, reel.posterUrl]);

  useEffect(() => {
    const onResize = () => {
      if (!isPlaying && canvasRef.current) {
        drawReelFrame(canvasRef.current, reel.motionType, reel.client, reel.title, 0);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isPlaying, reel.motionType, reel.client, reel.title]);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    lastPointerTypeRef.current = e.pointerType || 'mouse';
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
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

  const useLightBg = Boolean(reel.lightBg && !resolvedVideoUrl && (reel.gifUrl || reel.posterUrl));

  return (
    <article
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setIsHoverPlaying(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch') setIsHoverPlaying(false);
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`portfolio-tile reel-tile relative aspect-[4/5] overflow-hidden border border-white/15 shadow-xl ${
        useLightBg ? 'bg-white' : 'bg-obsidian'
      } ${isPlaying ? 'is-playing' : ''} ${isTouchMorphed ? 'is-morphed' : ''}`}
    >
      <div className={`tile-art relative w-full h-full ${useLightBg ? 'p-4 flex items-center justify-center' : ''}`}>
        {resolvedVideoUrl ? (
          <video
            key={resolvedVideoUrl}
            ref={videoRef}
            src={resolvedVideoUrl}
            poster={resolvedPosterUrl || undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : reel.gifUrl ? (
          <>
            {!reel.posterUrl && !useLightBg && <canvas ref={canvasRef} className="w-full h-full block" />}
            <img
              src={isPlaying ? reel.gifUrl : reel.posterUrl || reel.gifUrl}
              alt={reel.title}
              referrerPolicy="no-referrer"
              className={
                useLightBg
                  ? 'w-full h-full object-contain'
                  : reel.posterUrl
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
        <span className="px-2.5 py-1 rounded-full bg-obsidian/75 backdrop-blur-md border border-crimson/45 text-[9.5px] font-bold text-zinc-100 truncate max-w-[52%]">
          {reel.toolTag}
        </span>
      </div>

      {/* Bottom Overlay */}
      <div className="tile-overlay absolute inset-x-2.5 bottom-2.5 rounded-2xl bg-obsidian/90 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2 z-10">
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
