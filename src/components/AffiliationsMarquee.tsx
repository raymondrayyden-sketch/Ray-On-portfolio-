import React, { useRef, useState } from 'react';
import type { AffiliationItem, PortfolioCopy } from '../types/portfolio';
import { optimizeCloudinaryUrl } from '../services/portfolioCloud';
import { EditableText } from './EditableText';

interface AffiliationsMarqueeProps {
  affiliations: AffiliationItem[];
  heading: string;
  editMode: boolean;
  isCloudLoading?: boolean;
  onCopyChange: (key: keyof PortfolioCopy, val: string) => void;
}

function getOrgMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => !['by', 'of', 'the', 'and', '&'].includes(w.toLowerCase()));
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 3).toUpperCase() || 'ORG';
}

export function AffiliationsMarquee({
  affiliations,
  heading,
  editMode,
  isCloudLoading = false,
  onCopyChange,
}: AffiliationsMarqueeProps) {
  const [activeTileKey, setActiveTileKey] = useState<string | null>(null);
  const lastPointerTypeRef = useRef<string>('mouse');

  if (!affiliations || affiliations.length === 0) {
    return null;
  }

  // Repeat base set so even 1–4 logos fill ultra-wide screens seamlessly before mirroring
  const repeatFactor = affiliations.length < 8 ? Math.ceil(8 / affiliations.length) : 1;
  const singleTrack: AffiliationItem[] = [];
  for (let i = 0; i < repeatFactor; i++) {
    singleTrack.push(...affiliations);
  }

  const durationSeconds = Math.max(22, singleTrack.length * 3.8);

  const renderLogoTile = (item: AffiliationItem, keyPrefix: string, idx: number) => {
    const tileKey = `${keyPrefix}-${item.id}-${idx}`;

    if (isCloudLoading) {
      return (
        <div
          key={tileKey}
          className="h-16 sm:h-[74px] w-28 sm:w-36 rounded-2xl bg-zinc-900 animate-pulse border border-white/10 shrink-0"
          aria-hidden="true"
        />
      );
    }

    const optimizedLogo = item.logoUrl ? optimizeCloudinaryUrl(item.logoUrl, 400) || item.logoUrl : null;
    const isMorphed = activeTileKey === tileKey;

    const innerTile = (
      <div
        title={item.name}
        onPointerDown={(e) => {
          lastPointerTypeRef.current = e.pointerType || 'mouse';
        }}
        className={`org-logo-tile group/org relative h-16 sm:h-[74px] w-28 sm:w-36 px-4 py-2.5 flex items-center justify-center border shadow-[0_8px_24px_rgba(0,0,0,0.42)] shrink-0 ${
          optimizedLogo && item.lightLogoBg
            ? 'bg-white border-white/85'
            : optimizedLogo
              ? 'bg-white/[0.05] border-white/12'
              : 'bg-gradient-to-br from-white/[0.06] via-crimson/12 to-obsidian border-white/12'
        } ${isMorphed ? 'is-morphed' : ''}`}
      >
        {optimizedLogo ? (
          <img
            src={optimizedLogo}
            alt={item.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="org-logo-img max-w-full max-h-full object-contain"
          />
        ) : (
          <span className="font-syne text-sm sm:text-base font-extrabold tracking-[0.16em] uppercase text-white/85 group-hover/org:text-crimson transition-colors select-none">
            {getOrgMonogram(item.name)}
          </span>
        )}

        {/* Signature Ray-On Floating Hover / Tap Tooltip */}
        <span className="org-tooltip pointer-events-none absolute -top-8 left-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-obsidian/95 border border-crimson/65 text-[10px] font-montserrat font-bold tracking-wider uppercase text-white shadow-[0_6px_18px_rgba(230,10,21,0.38)] z-20">
          {item.name}
        </span>
      </div>
    );

    const safeHref =
      item.websiteUrl && /^https?:\/\//i.test(item.websiteUrl.trim()) ? item.websiteUrl.trim() : '';

    if (safeHref) {
      return (
        <a
          key={tileKey}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.name}
          title={item.name}
          onClick={(e) => {
            if (lastPointerTypeRef.current === 'touch' && !isMorphed) {
              e.preventDefault();
              e.stopPropagation();
              setActiveTileKey(tileKey);
            }
          }}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson rounded-2xl"
        >
          {innerTile}
        </a>
      );
    }

    return (
      <div
        key={tileKey}
        role="button"
        tabIndex={0}
        aria-label={item.name}
        onClick={(e) => {
          e.stopPropagation();
          setActiveTileKey((prev) => (prev === tileKey ? null : tileKey));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveTileKey((prev) => (prev === tileKey ? null : tileKey));
          }
        }}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson rounded-2xl"
      >
        {innerTile}
      </div>
    );
  };

  return (
    <footer
      id="affiliations"
      aria-label="Affiliated Organizations"
      onClick={() => setActiveTileKey(null)}
      className="relative bg-[#070304] border-t border-crimson/40 overflow-hidden py-7 sm:py-9"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(230,10,21,0.12),transparent_70%)]" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mb-3 flex items-center justify-center text-center gap-3">
        <div className="flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-crimson shadow-[0_0_10px_#E60A15]" />
          <EditableText
            as="h2"
            copyKey="affiliationsHeading"
            value={heading}
            editMode={editMode}
            onChange={onCopyChange}
            className="font-montserrat text-[11px] sm:text-xs font-extrabold tracking-[0.22em] uppercase text-crimson-white text-center"
          />
        </div>
      </div>

      {/* Seamless Right-to-Left Rolling Logo Strip with Signature Hover Morph & Pause */}
      <div
        className={`marquee-container marquee-mask relative z-10 w-full overflow-hidden pt-9 pb-4 ${
          activeTileKey ? 'is-paused' : ''
        }`}
      >
        <div
          className="marquee-track"
          style={{ '--marquee-duration': `${durationSeconds}s` } as React.CSSProperties}
        >
          <div className="flex items-center gap-4 sm:gap-5 pr-4 sm:pr-5 shrink-0">
            {singleTrack.map((item, idx) => renderLogoTile(item, 'a', idx))}
          </div>
          <div className="flex items-center gap-4 sm:gap-5 pr-4 sm:pr-5 shrink-0" aria-hidden="true">
            {singleTrack.map((item, idx) => renderLogoTile(item, 'b', idx))}
          </div>
        </div>
      </div>
    </footer>
  );
}
