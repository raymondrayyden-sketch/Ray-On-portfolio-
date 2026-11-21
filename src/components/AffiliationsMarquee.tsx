import React from 'react';
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
    if (isCloudLoading) {
      return (
        <div
          key={`${keyPrefix}-${item.id}-${idx}`}
          className="h-16 sm:h-[74px] w-28 sm:w-36 rounded-2xl bg-zinc-900 animate-pulse border border-white/10 shrink-0"
          aria-hidden="true"
        />
      );
    }

    const optimizedLogo = item.logoUrl ? optimizeCloudinaryUrl(item.logoUrl, 400) || item.logoUrl : null;

    const innerTile = (
      <div
        title={item.name}
        className={`group/org h-16 sm:h-[74px] w-28 sm:w-36 rounded-2xl px-4 py-2.5 flex items-center justify-center border transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.42)] shrink-0 ${
          optimizedLogo && item.lightLogoBg
            ? 'bg-white border-white/85 hover:border-crimson'
            : optimizedLogo
              ? 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 hover:border-crimson/65'
              : 'bg-gradient-to-br from-white/[0.05] via-crimson/10 to-obsidian border-white/12 hover:border-crimson/65'
        }`}
      >
        {optimizedLogo ? (
          <img
            src={optimizedLogo}
            alt={item.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover/org:scale-105"
          />
        ) : (
          <span className="font-syne text-sm sm:text-base font-extrabold tracking-[0.16em] uppercase text-white/85 group-hover/org:text-crimson transition-colors select-none">
            {getOrgMonogram(item.name)}
          </span>
        )}
      </div>
    );

    const safeHref =
      item.websiteUrl && /^https?:\/\//i.test(item.websiteUrl.trim()) ? item.websiteUrl.trim() : '';

    if (safeHref) {
      return (
        <a
          key={`${keyPrefix}-${item.id}-${idx}`}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.name}
          title={item.name}
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson rounded-2xl"
        >
          {innerTile}
        </a>
      );
    }

    return <div key={`${keyPrefix}-${item.id}-${idx}`}>{innerTile}</div>;
  };

  return (
    <footer
      id="affiliations"
      aria-label="Affiliated Organizations"
      className="relative bg-[#070304] border-t border-crimson/40 overflow-hidden py-7 sm:py-9"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(230,10,21,0.12),transparent_70%)]" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-crimson shadow-[0_0_10px_#E60A15]" />
          <EditableText
            as="h2"
            copyKey="affiliationsHeading"
            value={heading}
            editMode={editMode}
            onChange={onCopyChange}
            className="font-montserrat text-[11px] sm:text-xs font-extrabold tracking-[0.22em] uppercase text-crimson-white"
          />
        </div>
      </div>

      {/* Seamless Right-to-Left Rolling Logo Strip */}
      <div className="marquee-container marquee-mask relative z-10 w-full overflow-hidden py-1">
        <div
          className="marquee-track"
          style={{ '--marquee-duration': `${durationSeconds}s` } as React.CSSProperties}
        >
          <div className="flex items-center gap-3.5 sm:gap-4 pr-3.5 sm:pr-4 shrink-0">
            {singleTrack.map((item, idx) => renderLogoTile(item, 'a', idx))}
          </div>
          <div className="flex items-center gap-3.5 sm:gap-4 pr-3.5 sm:pr-4 shrink-0" aria-hidden="true">
            {singleTrack.map((item, idx) => renderLogoTile(item, 'b', idx))}
          </div>
        </div>
      </div>
    </footer>
  );
}
