import React, { useEffect, useState } from 'react';
import { copySafely } from '../utils/svgArtwork';

interface EmailModalProps {
  isOpen: boolean;
  recipientEmail: string;
  recipientName: string;
  initialSubject?: string;
  initialBody?: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function EmailModal({
  isOpen,
  recipientEmail,
  recipientName,
  initialSubject = '',
  initialBody = '',
  onClose,
  showToast,
}: EmailModalProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [copiedField, setCopiedField] = useState<'email' | 'all' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject || `Project Inquiry for ${recipientName}`);
      setBody(initialBody);
      setCopiedField(null);
    }
  }, [isOpen, initialSubject, initialBody, recipientName]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanEmail = (recipientEmail || '').trim();
  const encTo = encodeURIComponent(cleanEmail);
  const encSubject = encodeURIComponent(subject.trim());
  const encBody = encodeURIComponent(body.trim());

  const gmailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encTo}&su=${encSubject}&body=${encBody}`;
  const outlookHref = `https://outlook.live.com/mail/0/deeplink/compose?to=${encTo}&subject=${encSubject}&body=${encBody}`;
  const mailtoHref = `mailto:${cleanEmail}?subject=${encSubject}&body=${encBody}`;

  const handleCopyEmail = async () => {
    const ok = await copySafely(cleanEmail);
    if (ok) {
      setCopiedField('email');
      showToast(`Copied ${cleanEmail}!`);
      window.setTimeout(() => setCopiedField(null), 2200);
    } else {
      showToast('Could not copy automatically — please select the email address.');
    }
  };

  const handleCopyAll = async () => {
    const fullText = [
      `To: ${cleanEmail}`,
      subject.trim() ? `Subject: ${subject.trim()}` : '',
      body.trim() ? `\n${body.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const ok = await copySafely(fullText);
    if (ok) {
      setCopiedField('all');
      showToast('Copied email & message to clipboard!');
      window.setTimeout(() => setCopiedField(null), 2200);
    } else {
      showToast('Could not copy automatically.');
    }
  };

  return (
    <div
      id="emailComposerBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emailComposerTitle"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/82 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[1.8rem] bg-[#110506] border border-crimson/55 shadow-[0_0_60px_rgba(230,10,21,0.38)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-obsidian/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-crimson/20 border border-crimson/45 text-crimson flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 id="emailComposerTitle" className="font-syne text-lg font-extrabold text-white truncate">
                Send Email to {recipientName}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                Choose Gmail, Outlook, your default mail app, or copy directly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close email dialog"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-crimson text-white flex items-center justify-center transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Recipient row with instant copy */}
          <div className="rounded-xl bg-white/[0.04] border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="block text-[10px] font-montserrat font-bold uppercase tracking-widest text-zinc-400">
                Recipient Email
              </span>
              <span className="block text-xs sm:text-sm font-semibold text-white truncate select-all">
                {cleanEmail}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleCopyEmail()}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-crimson text-[11px] font-bold text-white transition-colors shrink-0"
            >
              {copiedField === 'email' ? 'Copied ✓' : 'Copy Email'}
            </button>
          </div>

          <div>
            <label htmlFor="emailModalSubject" className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Subject
            </label>
            <input
              id="emailModalSubject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Project Inquiry — Brand Identity / Video Ad"
              className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-crimson"
            />
          </div>

          <div>
            <label htmlFor="emailModalBody" className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Message
            </label>
            <textarea
              id="emailModalBody"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a quick note about your brand, project goals, or timeline..."
              className="w-full rounded-xl bg-white/[0.06] border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-crimson"
            />
          </div>

          {/* Primary & secondary mail launcher buttons */}
          <div className="space-y-2.5 pt-1">
            <a
              href={gmailHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => showToast('Opening Gmail compose...')}
              className="w-full btn-crimson-pill inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs font-montserrat font-extrabold tracking-wider text-obsidian shadow-lg shadow-crimson/40"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>OPEN IN GMAIL</span>
            </a>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <a
                href={outlookHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => showToast('Opening Outlook Web...')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-semibold text-white transition-colors text-center"
              >
                Outlook Web
              </a>
              <a
                href={mailtoHref}
                target="_top"
                onClick={() => showToast('Launching default mail app...')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-semibold text-white transition-colors text-center"
              >
                Default Mail App
              </a>
              <button
                type="button"
                onClick={() => void handleCopyAll()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-white/10 hover:bg-crimson border border-white/15 hover:border-crimson text-[11px] font-semibold text-white transition-colors"
              >
                {copiedField === 'all' ? 'Copied ✓' : 'Copy Details'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
