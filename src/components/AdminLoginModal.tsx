import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { signInAdminWithEmail } from '../services/portfolioCloud';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function AdminLoginModal({ isOpen, onClose, onSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const user = await signInAdminWithEmail(email, password);
      setPassword('');
      onSuccess(user);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="adminLoginBackdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adminLoginTitle"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-[#120607] border border-crimson/55 shadow-[0_0_60px_rgba(230,10,21,0.35)] p-6 sm:p-7 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-crimson/20 border border-crimson/40 text-[10px] font-montserrat font-bold uppercase tracking-widest text-crimson mb-2">
              Admin Access Only
            </span>
            <h3 id="adminLoginTitle" className="font-syne text-xl sm:text-2xl font-extrabold text-white">
              Sign in to Edit Site
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Sign in with your Firebase Admin email &amp; password to edit copy, upload media to Cloudinary, and sync to Cloud.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Admin Login"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-crimson text-white flex items-center justify-center transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-950/70 border border-red-500/50 px-3.5 py-2.5 text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="adminEmailInput" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Admin Email
            </label>
            <input
              id="adminEmailInput"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourdomain.com"
              className="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-crimson"
            />
          </div>

          <div>
            <label htmlFor="adminPasswordInput" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              id="adminPasswordInput"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-crimson"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-crimson-pill py-3 px-5 rounded-full text-xs font-montserrat font-extrabold tracking-wider text-obsidian shadow-lg shadow-crimson/40 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-obsidian/30 border-t-obsidian animate-spin" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              <span>SIGN IN TO STUDIO EDITOR</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
          Public visitors can browse your portfolio freely without signing in. Only authenticated admins can save changes.
        </p>
      </div>
    </div>
  );
}
