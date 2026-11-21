import React, { useRef } from 'react';
import type { PortfolioCopy } from '../types/portfolio';
import { escapeHtml, formatRichText } from '../utils/svgArtwork';

interface EditableTextProps {
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'div';
  copyKey: keyof PortfolioCopy;
  value: string;
  editMode: boolean;
  onChange: (key: keyof PortfolioCopy, newValue: string) => void;
  rich?: boolean;
  multiline?: boolean;
  className?: string;
}

export function EditableText({
  as = 'span',
  copyKey,
  value,
  editMode,
  onChange,
  rich = false,
  multiline = false,
  className = '',
}: EditableTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const isEditingRef = useRef(false);

  const handleFocus = () => {
    if (!editMode || !ref.current) return;
    isEditingRef.current = true;
    if (rich || multiline) {
      ref.current.innerText = value;
    }
  };

  const handleBlur = () => {
    if (!editMode || !ref.current) return;
    isEditingRef.current = false;
    const raw = (ref.current.innerText || '').replace(/\r/g, '').trim();
    if (raw !== value) {
      onChange(copyKey, raw);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!editMode) return;
    if (!multiline && !rich && e.key === 'Enter') {
      e.preventDefault();
      ref.current?.blur();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (editMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const Tag = as;

  if (rich && !editMode) {
    return (
      <Tag
        data-editable={copyKey}
        className={className}
        dangerouslySetInnerHTML={{ __html: formatRichText(value) }}
      />
    );
  }

  if (multiline && !editMode) {
    return (
      <Tag
        data-editable={copyKey}
        className={className}
        dangerouslySetInnerHTML={{ __html: escapeHtml(value).replace(/\n/g, '<br />') }}
      />
    );
  }

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      data-editable={copyKey}
      contentEditable={editMode}
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={className}
    >
      {value}
    </Tag>
  );
}
