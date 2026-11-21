import React, { useRef } from 'react';
import type { ProjectItem } from '../types/portfolio';
import { buildProjectArtworkSVG } from '../utils/svgArtwork';
import { ResilientImage } from './ResilientImage';

interface ProjectTileProps {
  project: ProjectItem;
  isTouchMorphed: boolean;
  onTouchMorph: (id: string) => void;
  onOpenLightbox: (id: string) => void;
}

export function ProjectTile({
  project,
  isTouchMorphed,
  onTouchMorph,
  onOpenLightbox,
}: ProjectTileProps) {
  const lastPointerTypeRef = useRef<string>('mouse');

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    lastPointerTypeRef.current = e.pointerType || 'mouse';
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
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

  const useLightBg = Boolean(project.image && project.lightBg);

  return (
    <article
      role="button"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`portfolio-tile relative aspect-square overflow-hidden border border-white/20 shadow-lg ${
        useLightBg ? 'bg-white' : 'bg-obsidian'
      } ${isTouchMorphed ? 'is-morphed' : ''}`}
    >
      <div className={`tile-art w-full h-full ${useLightBg ? 'p-5 flex items-center justify-center' : ''}`}>
        <ResilientImage
          primarySrc={project.image}
          secondarySrc={project.fallbackImage}
          fallbackSVG={buildProjectArtworkSVG(project.artKey, project.client)}
          alt={`${project.client} — ${project.title}`}
          className={useLightBg ? 'w-full h-full object-contain' : 'w-full h-full object-cover object-top'}
        />
      </div>

      <div className="tile-overlay absolute inset-x-2.5 bottom-2.5 rounded-2xl bg-obsidian/88 backdrop-blur-md border border-white/20 p-3 flex items-center justify-between gap-2">
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
