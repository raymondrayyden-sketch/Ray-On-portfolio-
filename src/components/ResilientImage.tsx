import { useEffect, useState } from 'react';

interface ResilientImageProps {
  primarySrc?: string | null;
  secondarySrc?: string | null;
  fallbackSVG: string;
  alt: string;
  className?: string;
}

export function ResilientImage({
  primarySrc,
  secondarySrc,
  fallbackSVG,
  alt,
  className = 'w-full h-full object-cover',
}: ResilientImageProps) {
  const [stage, setStage] = useState<'primary' | 'secondary' | 'svg'>(
    primarySrc ? 'primary' : secondarySrc ? 'secondary' : 'svg'
  );

  useEffect(() => {
    setStage(primarySrc ? 'primary' : secondarySrc ? 'secondary' : 'svg');
  }, [primarySrc, secondarySrc]);

  if (stage === 'svg') {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: fallbackSVG }}
      />
    );
  }

  const activeSrc = stage === 'primary' ? primarySrc : secondarySrc;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src={activeSrc || ''}
        alt={alt}
        referrerPolicy="no-referrer"
        className={className}
        onError={() => {
          if (stage === 'primary' && secondarySrc) {
            setStage('secondary');
          } else {
            setStage('svg');
          }
        }}
      />
    </div>
  );
}
