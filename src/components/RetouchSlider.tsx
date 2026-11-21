import React, { useRef, useState } from 'react';
import type { PortfolioCopy } from '../types/portfolio';
import { buildStudioPortraitSVG } from '../utils/svgArtwork';
import { ResilientImage } from './ResilientImage';
import { EditableText } from './EditableText';

interface RetouchSliderProps {
  beforeSrc: string | null;
  afterSrc: string | null;
  copy: PortfolioCopy;
  editMode: boolean;
  onCopyChange: (key: keyof PortfolioCopy, val: string) => void;
}

export function RetouchSlider({
  beforeSrc,
  afterSrc,
  copy,
  editMode,
  onCopyChange,
}: RetouchSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [pct, setPct] = useState(50);

  const updatePosition = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const next = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
    setPct(next);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editMode && (e.target as HTMLElement).closest('[data-editable]')) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      updatePosition(e.clientX);
    }
  };

  const stopDrag = () => {
    draggingRef.current = false;
  };

  return (
    <div className="mb-8 rounded-[2rem] bg-white/[0.03] border border-crimson/35 p-4 sm:p-6 shadow-2xl shadow-crimson/15">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7">
          <div
            ref={containerRef}
            id="retouchSliderContainer"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            className="relative w-full aspect-[4/3] sm:aspect-[16/11] rounded-2xl overflow-hidden select-none touch-none border border-white/15 bg-obsidian shadow-xl cursor-ew-resize"
          >
            {/* After Layer (Crimson Graded) — filter sits directly on layer so both img & SVG fallback grade */}
            <div id="retouchAfterLayer" className="retouch-graded-filter absolute inset-0 w-full h-full">
              <ResilientImage
                primarySrc={afterSrc}
                fallbackSVG={buildStudioPortraitSVG('graded')}
                alt="After Retouching Crimson Editorial Portrait"
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Before Layer (Raw Flat) */}
            <div
              id="retouchBeforeClip"
              className="absolute inset-0 w-full h-full overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
            >
              <div id="retouchBeforeLayer" className="retouch-raw-filter w-full h-full">
                <ResilientImage
                  primarySrc={beforeSrc}
                  fallbackSVG={buildStudioPortraitSVG('raw')}
                  alt="Before Retouching Raw Studio Portrait"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            <EditableText
              as="span"
              copyKey="retouchBeforeLabel"
              value={copy.retouchBeforeLabel}
              editMode={editMode}
              onChange={onCopyChange}
              className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-obsidian/80 backdrop-blur-md border border-white/20 text-[10px] font-montserrat font-bold tracking-widest uppercase text-zinc-200"
            />
            <EditableText
              as="span"
              copyKey="retouchAfterLabel"
              value={copy.retouchAfterLabel}
              editMode={editMode}
              onChange={onCopyChange}
              className="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-crimson/90 backdrop-blur-md border border-white/25 text-[10px] font-montserrat font-bold tracking-widest uppercase text-white shadow-lg"
            />

            <div
              id="retouchHandleLine"
              className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_16px_rgba(230,10,21,0.9)]"
              style={{ left: `${pct}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-crimson border-2 border-white shadow-[0_0_24px_rgba(230,10,21,0.85)] flex items-center justify-center text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="8 6 2 12 8 18" />
                  <polyline points="16 6 22 12 16 18" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <EditableText
            as="span"
            copyKey="retouchBadge"
            value={copy.retouchBadge}
            editMode={editMode}
            onChange={onCopyChange}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson/20 border border-crimson/45 text-[11px] font-bold uppercase tracking-wider text-crimson"
          />
          <EditableText
            as="h3"
            copyKey="retouchTitle"
            value={copy.retouchTitle}
            editMode={editMode}
            onChange={onCopyChange}
            className="font-syne text-2xl sm:text-3xl font-extrabold text-white leading-tight block"
          />
          <EditableText
            as="p"
            copyKey="retouchDesc"
            value={copy.retouchDesc}
            editMode={editMode}
            onChange={onCopyChange}
            rich
            className="text-xs sm:text-sm leading-relaxed text-zinc-300"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {(['retouchTag1', 'retouchTag2', 'retouchTag3', 'retouchTag4'] as const).map((tagKey) => (
              <EditableText
                key={tagKey}
                as="span"
                copyKey={tagKey}
                value={copy[tagKey]}
                editMode={editMode}
                onChange={onCopyChange}
                className="px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-zinc-200"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
