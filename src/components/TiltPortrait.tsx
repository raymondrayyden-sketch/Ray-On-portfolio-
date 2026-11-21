import React, { useRef } from 'react';

interface TiltPortraitProps {
  id: string;
  className: string;
  isMorphed: boolean;
  onToggleMorph: () => void;
  editMode: boolean;
  enableTilt?: boolean;
  children: React.ReactNode;
}

export function TiltPortrait({
  id,
  className,
  isMorphed,
  onToggleMorph,
  editMode,
  enableTilt = true,
  children,
}: TiltPortraitProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableTilt || e.pointerType === 'touch' || !cardRef.current) return;
    cardRef.current.style.transition =
      'border-radius 0.65s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.08s linear, box-shadow 0.52s ease, border-color 0.42s ease';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableTilt || e.pointerType === 'touch' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.transform = `perspective(720px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.075)`;
  };

  const handlePointerLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transition = '';
    cardRef.current.style.transform = '';
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editMode && (e.target as HTMLElement).closest('[data-editable]')) return;
    e.stopPropagation();
    onToggleMorph();
  };

  return (
    <div
      ref={cardRef}
      id={id}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      className={`${className} ${isMorphed ? 'is-morphed' : ''}`}
    >
      {children}
    </div>
  );
}
