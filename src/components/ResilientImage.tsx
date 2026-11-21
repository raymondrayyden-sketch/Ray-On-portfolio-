import { useEffect, useState } from 'react';
import { optimizeCloudinaryUrl } from '../services/portfolioCloud';

interface ResilientImageProps {
  primarySrc?: string | null;
  secondarySrc?: string | null;
  fallbackSVG: string;
  alt: string;
  className?: string;
  cloudinaryWidth?: number;
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'sync' | 'auto';
  isSkeletonLoading?: boolean;
}

export function ResilientImage({
  primarySrc,
  secondarySrc,
  fallbackSVG,
  alt,
  className = 'w-full h-full object-cover',
  cloudinaryWidth,
  fetchPriority,
  loading,
  decoding = 'async',
  isSkeletonLoading = false,
}: ResilientImageProps) {
  const optimizedPrimary =
    primarySrc && cloudinaryWidth ? optimizeCloudinaryUrl(primarySrc, cloudinaryWidth) : primarySrc;
  const optimizedSecondary =
    secondarySrc && cloudinaryWidth
      ? optimizeCloudinaryUrl(secondarySrc, cloudinaryWidth)
      : secondarySrc;

  const [stage, setStage] = useState<'primary' | 'secondary' | 'svg'>(
    optimizedPrimary ? 'primary' : optimizedSecondary ? 'secondary' : 'svg'
  );
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  useEffect(() => {
    setStage(optimizedPrimary ? 'primary' : optimizedSecondary ? 'secondary' : 'svg');
    setIsImgLoaded(false);
  }, [optimizedPrimary, optimizedSecondary]);

  // While Firestore is doing its initial fetch on a cold visit, render a sleek dark skeleton instead of flashing SVGs/stock art
  if (isSkeletonLoading) {
    return <div className="w-full h-full bg-zinc-900 animate-pulse" aria-hidden="true" />;
  }

  if (stage === 'svg') {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: fallbackSVG }}
      />
    );
  }

  const activeSrc = stage === 'primary' ? optimizedPrimary : optimizedSecondary;

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center ${
        !isImgLoaded ? 'bg-zinc-900/80 animate-pulse' : ''
      }`}
    >
      <img
        src={activeSrc || ''}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        className={className}
        onLoad={() => setIsImgLoaded(true)}
        onError={() => {
          setIsImgLoaded(false);
          if (stage === 'primary' && optimizedSecondary) {
            setStage('secondary');
          } else {
            setStage('svg');
          }
        }}
      />
    </div>
  );
}
