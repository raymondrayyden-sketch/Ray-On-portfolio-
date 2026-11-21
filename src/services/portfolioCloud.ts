import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import type { PortfolioConfig } from '../types/portfolio';
import { DEFAULT_PORTFOLIO_CONFIG } from '../data/defaultPortfolio';
import { deepClone } from '../utils/svgArtwork';

export const CLOUDINARY_CONFIG = {
  cloudName: 'urwej0rr',
  uploadPreset: 'rayon_portfolio',
  uploadUrl: 'https://api.cloudinary.com/v1_1/urwej0rr/auto/upload',
  videoUploadUrl: 'https://api.cloudinary.com/v1_1/urwej0rr/video/upload',
} as const;

export const PORTFOLIO_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDG13UuwidO2MkhkyibF9Eyz2E7HNZYHHU',
  authDomain: 'rayon-portfolio.firebaseapp.com',
  projectId: 'rayon-portfolio',
  storageBucket: 'rayon-portfolio.firebasestorage.app',
  messagingSenderId: '657127311781',
  appId: '1:657127311781:web:21f6989266b0027368004c',
  measurementId: 'G-2SPELX52F6',
} as const;

const PORTFOLIO_APP_NAME = 'rayon-portfolio-cms';

function getPortfolioFirebaseApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === PORTFOLIO_APP_NAME);
  return existing ?? initializeApp(PORTFOLIO_FIREBASE_CONFIG, PORTFOLIO_APP_NAME);
}

const portfolioApp = getPortfolioFirebaseApp();
export const portfolioDb: Firestore = getFirestore(portfolioApp);
export const portfolioAuth: Auth = getAuth(portfolioApp);

const PORTFOLIO_COLLECTION = 'portfolio';
const PORTFOLIO_DOC_ID = 'main';
const PORTFOLIO_CACHE_KEY = 'rayon_portfolio_cloud_cache_v1';

const VIDEO_EXT_REGEX = /\.(mp4|mov|webm|m4v|ogg|ogv|avi|mkv|3gp|wmv)$/i;
const TRANSCODE_VIDEO_EXT_REGEX = /\.(mov|mkv|avi|3gp|wmv|m4v)$/i;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB (Cloudinary free-tier video limit)
const CHUNK_THRESHOLD_BYTES = 18 * 1024 * 1024; // Use chunked upload above 18 MB
const CHUNK_SIZE_BYTES = 6 * 1024 * 1024; // 6 MB chunks (>= 5 MB required by Cloudinary)
const MAX_INLINE_IMAGE_BASE64_BYTES = 5 * 1024; // 5 KB limit for inline data:image/* Base64 cleanup
const MAX_INLINE_BASE64_BYTES = 100 * 1024; // 100 KB limit for any other inline data: string

export interface CloudinaryUploadResult {
  secureUrl: string;
  posterUrl?: string;
  resourceType: string;
  originalFilename: string;
  bytes: number;
}

export interface CloudinaryUploadOptions {
  onProgress?: (percent: number) => void;
}

export function isVideoFile(file: File | Blob, fileName?: string): boolean {
  if (file.type && file.type.startsWith('video/')) return true;
  const name = fileName || (file instanceof File ? file.name : '');
  return VIDEO_EXT_REGEX.test(name);
}

export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim().split('?')[0];
  if (clean.includes('/video/upload/')) return true;
  return VIDEO_EXT_REGEX.test(clean);
}

/**
 * Auto-optimizes Cloudinary image URLs by injecting f_auto,q_auto,w_${width},c_limit/
 * right after /image/upload/ (when not already optimized with f_auto).
 */
export function optimizeCloudinaryUrl(url: string | null | undefined, width = 1000): string | null {
  if (!url || typeof url !== 'string') return url ?? null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.includes('res.cloudinary.com') &&
    trimmed.includes('/image/upload/') &&
    !trimmed.includes('f_auto')
  ) {
    return trimmed.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
  }
  return trimmed;
}

/**
 * Converts a Cloudinary video secure_url to a universally playable H.264 MP4 streaming URL
 * by inserting f_mp4,vc_h264,q_auto right after /upload/ (so phone HEVC/.mov/.mp4 videos play on every browser).
 */
export function normalizeCloudinaryVideoUrl(secureUrl: string): string {
  if (!secureUrl || typeof secureUrl !== 'string') return secureUrl;
  const trimmed = secureUrl.trim();
  if (!trimmed.includes('res.cloudinary.com') || !trimmed.includes('/upload/')) {
    return trimmed;
  }

  let normalized = trimmed;

  // Upgrade legacy vc_auto transforms to explicit H.264
  if (normalized.includes('/upload/f_mp4,vc_auto,q_auto/')) {
    normalized = normalized.replace('/upload/f_mp4,vc_auto,q_auto/', '/upload/f_mp4,vc_h264,q_auto/');
  } else if (!normalized.includes('/upload/f_mp4,vc_h264,q_auto/')) {
    normalized = normalized.replace('/upload/', '/upload/f_mp4,vc_h264,q_auto/');
  }

  // Ensure non-MP4 extensions (e.g. .mov, .mkv, .m4v) end in .mp4 for broad browser MIME compatibility
  const [basePath, query] = normalized.split('?');
  const mp4Path = TRANSCODE_VIDEO_EXT_REGEX.test(basePath)
    ? basePath.replace(TRANSCODE_VIDEO_EXT_REGEX, '.mp4')
    : basePath;
  return query ? `${mp4Path}?${query}` : mp4Path;
}

/**
 * Auto-generates a crisp JPEG cover thumbnail URL from a Cloudinary video URL
 * by stripping any video-only f_mp4 transform and replacing the video extension with .jpg.
 */
export function deriveCloudinaryVideoPoster(videoUrl: string | null | undefined): string | undefined {
  if (!videoUrl || typeof videoUrl !== 'string') return undefined;
  const trimmed = videoUrl.trim();
  if (!trimmed.includes('res.cloudinary.com') || !trimmed.includes('/video/upload/')) {
    return undefined;
  }
  const withoutQuery = trimmed.split('?')[0];
  // Remove video-forcing transformations so Cloudinary serves a real JPEG frame instead of MP4
  const withoutVideoTransform = withoutQuery
    .replace('/video/upload/f_mp4,vc_h264,q_auto/', '/video/upload/')
    .replace('/video/upload/f_mp4,vc_auto,q_auto/', '/video/upload/');
  return withoutVideoTransform.replace(/\.[^./]+$/, '.jpg');
}

function isSafeUrl(val: string | null | undefined): boolean {
  if (!val) return true;
  const trimmed = val.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  return true;
}

function isValidMediaRef(trimmed: string): boolean {
  const lower = trimmed.toLowerCase();
  // Allow HTTPS/HTTP URLs, data: URLs, and valid root-relative asset paths; drop bare missing filenames (e.g. 249486.jpg)
  return (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('data:') ||
    trimmed.startsWith('/')
  );
}

function sanitizeUrl(val: string | null | undefined, fallback: string | null = null): string | null {
  if (!val || typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (!trimmed || !isSafeUrl(trimmed) || !isValidMediaRef(trimmed)) return fallback;
  return trimmed;
}

/**
 * Merges a remote Firestore portfolio document with DEFAULT_PORTFOLIO_CONFIG
 * so missing fields always fall back cleanly and broken local filenames are ignored.
 */
export function mergePortfolioConfig(saved: Partial<PortfolioConfig> | null | undefined): PortfolioConfig {
  const base = deepClone(DEFAULT_PORTFOLIO_CONFIG);
  if (!saved || typeof saved !== 'object') return base;

  const mergedImages = { ...base.images, ...(saved.images || {}) };
  (Object.keys(mergedImages) as Array<keyof PortfolioConfig['images']>).forEach((k) => {
    mergedImages[k] = sanitizeUrl(mergedImages[k], base.images[k] ?? null);
  });

  const mergedCv = {
    ...base.cv,
    ...(saved.cv || {}),
    fileUrl: sanitizeUrl(saved.cv?.fileUrl, base.cv.fileUrl),
  };

  const mergedAffiliations = Array.isArray(saved.affiliations)
    ? saved.affiliations.map((a, idx) => ({
        id: a.id || `aff-${idx}`,
        name: a.name || 'Organization',
        role: a.role || '',
        logoUrl: sanitizeUrl(a.logoUrl, null),
        websiteUrl: sanitizeUrl(a.websiteUrl, '') || '',
        lightLogoBg: Boolean(a.lightLogoBg),
      }))
    : base.affiliations;

  const sanitizeProjectList = (
    list: PortfolioConfig['identityProjects'] | undefined,
    fallbackList: PortfolioConfig['identityProjects']
  ) =>
    Array.isArray(list)
      ? list.map((item) => ({
          ...item,
          image: sanitizeUrl(item.image, null),
          fallbackImage: item.fallbackImage !== undefined ? sanitizeUrl(item.fallbackImage, null) : undefined,
        }))
      : fallbackList;

  const mergedVideoReels = Array.isArray(saved.videoReels)
    ? saved.videoReels.map((v) => {
        const cleanVideoUrl = sanitizeUrl(v.videoUrl, null);
        const normalizedVideoUrl = cleanVideoUrl ? normalizeCloudinaryVideoUrl(cleanVideoUrl) : null;
        const cleanPosterUrl = sanitizeUrl(v.posterUrl, null);
        return {
          ...v,
          videoUrl: normalizedVideoUrl,
          gifUrl: normalizedVideoUrl ? null : sanitizeUrl(v.gifUrl, null),
          posterUrl:
            cleanPosterUrl ||
            (normalizedVideoUrl ? deriveCloudinaryVideoPoster(normalizedVideoUrl) || null : null),
        };
      })
    : base.videoReels;

  return {
    ...base,
    ...saved,
    profile: { ...base.profile, ...(saved.profile || {}) },
    copy: { ...base.copy, ...(saved.copy || {}) },
    images: mergedImages,
    imageLightBg: { ...(base.imageLightBg || {}), ...(saved.imageLightBg || {}) },
    cv: mergedCv,
    services: Array.isArray(saved.services) ? saved.services : base.services,
    tools: Array.isArray(saved.tools) ? saved.tools : base.tools,
    identityProjects: sanitizeProjectList(saved.identityProjects, base.identityProjects),
    flyerProjects: sanitizeProjectList(saved.flyerProjects, base.flyerProjects),
    videoReels: mergedVideoReels,
    photoProjects: sanitizeProjectList(saved.photoProjects, base.photoProjects),
    testimonials: Array.isArray(saved.testimonials) ? saved.testimonials : base.testimonials,
    affiliations: mergedAffiliations,
  };
}

/**
 * Fast localStorage read cache for instant repeat visits with zero flicker.
 */
export function readCachedPortfolioConfig(): PortfolioConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PortfolioConfig>;
    if (!parsed || typeof parsed !== 'object' || !parsed.copy || !parsed.profile) {
      return null;
    }
    return mergePortfolioConfig(parsed);
  } catch {
    return null;
  }
}

/**
 * Persists the latest Firestore portfolio/main snapshot into localStorage for instant repeat loads.
 */
export function writeCachedPortfolioConfig(config: PortfolioConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const { payload } = sanitizeConfigForCloud(config);
    window.localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

function isOversizedBase64DataUrl(trimmed: string): boolean {
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:image/')) {
    return trimmed.length > MAX_INLINE_IMAGE_BASE64_BYTES;
  }
  if (lower.startsWith('data:')) {
    return trimmed.length > MAX_INLINE_BASE64_BYTES;
  }
  return false;
}

/**
 * Strips transient blob: URLs, missing local filenames, and any remaining data:image/* Base64 strings
 * larger than 5 KB (or any other data: string > 100 KB) so portfolio/main stays tiny and loads in <300ms.
 */
function sanitizeConfigForCloud(config: PortfolioConfig): {
  payload: PortfolioConfig;
  strippedBase64Count: number;
} {
  const cleaned = deepClone(config);
  let strippedBase64Count = 0;

  const stripTransient = (val: string | null | undefined, fallback: string | null = null): string | null => {
    if (!val || typeof val !== 'string') return fallback;
    const trimmed = val.trim();
    if (!trimmed || !isSafeUrl(trimmed)) return fallback;
    if (trimmed.startsWith('blob:')) return fallback;
    if (isOversizedBase64DataUrl(trimmed)) {
      strippedBase64Count += 1;
      return null;
    }
    if (!isValidMediaRef(trimmed)) return fallback;
    return trimmed;
  };

  (Object.keys(cleaned.images) as Array<keyof PortfolioConfig['images']>).forEach((k) => {
    const defaultImg = DEFAULT_PORTFOLIO_CONFIG.images[k] ?? null;
    const safeFallback =
      typeof defaultImg === 'string' && isOversizedBase64DataUrl(defaultImg) ? null : defaultImg;
    cleaned.images[k] = stripTransient(cleaned.images[k], safeFallback);
  });

  cleaned.imageLightBg = cleaned.imageLightBg || {};

  (['identityProjects', 'flyerProjects', 'photoProjects'] as const).forEach((col) => {
    cleaned[col].forEach((item) => {
      item.image = stripTransient(item.image, null);
      if (item.fallbackImage !== undefined) {
        item.fallbackImage = stripTransient(item.fallbackImage, null);
      }
    });
  });

  cleaned.videoReels.forEach((v) => {
    v.posterUrl = stripTransient(v.posterUrl, null);
    v.gifUrl = stripTransient(v.gifUrl, null);
    v.videoUrl = stripTransient(v.videoUrl, null);
  });

  if (cleaned.cv) {
    cleaned.cv.fileUrl = stripTransient(cleaned.cv.fileUrl, null);
  }

  if (Array.isArray(cleaned.affiliations)) {
    cleaned.affiliations.forEach((a) => {
      a.logoUrl = stripTransient(a.logoUrl, null);
      a.websiteUrl = stripTransient(a.websiteUrl, '') || '';
    });
  }

  // Recursive cleanup pass across the entire payload so no leftover data:image/* (>5 KB) bloat remains anywhere
  const stripDeepBase64 = (node: unknown): unknown => {
    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (isOversizedBase64DataUrl(trimmed)) {
        strippedBase64Count += 1;
        return null;
      }
      return node;
    }
    if (Array.isArray(node)) {
      return node.map((item) => stripDeepBase64(item));
    }
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      Object.keys(record).forEach((key) => {
        record[key] = stripDeepBase64(record[key]);
      });
    }
    return node;
  };

  stripDeepBase64(cleaned);

  return { payload: cleaned, strippedBase64Count };
}

/**
 * Fetches portfolio/main from Firestore, caches it in localStorage for instant repeat loads,
 * and merges with DEFAULT_PORTFOLIO_CONFIG.
 */
export async function loadConfigFromCloud(): Promise<{
  config: PortfolioConfig;
  existsInCloud: boolean;
  error?: string;
}> {
  try {
    const docRef = doc(portfolioDb, PORTFOLIO_COLLECTION, PORTFOLIO_DOC_ID);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return {
        config: deepClone(DEFAULT_PORTFOLIO_CONFIG),
        existsInCloud: false,
      };
    }
    const remoteData = snap.data() as Partial<PortfolioConfig>;
    const merged = mergePortfolioConfig(remoteData);
    writeCachedPortfolioConfig(merged);
    return {
      config: merged,
      existsInCloud: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to reach Firestore';
    console.warn('[PortfolioCloud] Firestore load fallback to defaults:', msg);
    return {
      config: readCachedPortfolioConfig() || deepClone(DEFAULT_PORTFOLIO_CONFIG),
      existsInCloud: false,
      error: msg,
    };
  }
}

/**
 * Saves the full PORTFOLIO_CONFIG permanently to Firestore portfolio/main via setDoc.
 * Automatically cleans out any leftover data:image/* Base64 bloat (>5 KB) so Firestore stays tiny & fast (<300ms).
 */
export async function saveConfigToCloud(
  config: PortfolioConfig
): Promise<{
  ok: boolean;
  status: string;
  error?: string;
  warning?: string;
  strippedBase64Count?: number;
  cleanedConfig?: PortfolioConfig;
}> {
  if (!portfolioAuth.currentUser) {
    return {
      ok: false,
      status: 'Sign in required to save',
      error: 'You must be signed in as admin to save changes to the cloud.',
    };
  }

  try {
    const { payload, strippedBase64Count } = sanitizeConfigForCloud(config);
    const docRef = doc(portfolioDb, PORTFOLIO_COLLECTION, PORTFOLIO_DOC_ID);
    await setDoc(docRef, {
      ...payload,
      updatedAt: new Date().toISOString(),
      updatedBy: portfolioAuth.currentUser.email || portfolioAuth.currentUser.uid,
    });
    writeCachedPortfolioConfig(payload);

    if (strippedBase64Count > 0) {
      const warning = `Synced to Cloud & cleaned ${strippedBase64Count} leftover Base64 image${
        strippedBase64Count === 1 ? '' : 's'
      } (>5 KB) so your site loads under 300ms. Re-upload any cleared image via Cloudinary.`;
      return {
        ok: true,
        status: `Synced (${strippedBase64Count} Base64 cleaned)`,
        warning,
        strippedBase64Count,
        cleanedConfig: payload,
      };
    }

    return { ok: true, status: 'Synced to Cloud', strippedBase64Count: 0, cleanedConfig: payload };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err || 'Cloud save failed');
    const isPermission =
      rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('insufficient');
    return {
      ok: false,
      status: isPermission ? `Permission denied: ${rawMsg}` : `Cloud save failed: ${rawMsg}`,
      error: rawMsg,
    };
  }
}

interface RawCloudinaryResponse {
  secure_url?: string;
  resource_type?: string;
  original_filename?: string;
  bytes?: number;
  error?: { message?: string };
}

function sendCloudinaryXhr(
  endpoint: string,
  formData: FormData,
  headers?: Record<string, string>,
  onProgress?: (loaded: number, total: number) => void
): Promise<RawCloudinaryResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);

    if (headers) {
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress(ev.loaded, ev.total);
      }
    };

    xhr.onload = () => {
      let data: RawCloudinaryResponse = {};
      try {
        data = JSON.parse(xhr.responseText || '{}') as RawCloudinaryResponse;
      } catch {
        // ignore JSON parse errors
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const msg =
          data.error?.message ||
          `Cloudinary upload failed (HTTP ${xhr.status}). Verify unsigned preset "${CLOUDINARY_CONFIG.uploadPreset}" allows this file type/size.`;
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading to Cloudinary. Check your internet connection and try again.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Try a smaller video file or a stronger connection.'));
    };

    xhr.send(formData);
  });
}

/**
 * Uploads any image, GIF, video (.mp4/.mov/.webm/etc.), or PDF/document permanently
 * to Cloudinary using the configured unsigned upload preset and returns its HTTPS secure_url.
 * Uses /video/upload + automatic 6 MB chunked upload for large videos (> 18 MB) with progress.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  fileName?: string,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult> {
  if (!file || file.size === 0) {
    throw new Error('Selected file is empty.');
  }

  const resolvedName = fileName || (file instanceof File ? file.name : 'portfolio-asset');
  const isVideo = isVideoFile(file, resolvedName);
  const endpoint = isVideo ? CLOUDINARY_CONFIG.videoUploadUrl : CLOUDINARY_CONFIG.uploadUrl;

  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `This video is ${sizeMb} MB, which exceeds Cloudinary's 100 MB free-tier video limit. Please compress it under 100 MB (e.g., 1080p MP4) and try again.`
    );
  }

  let data: RawCloudinaryResponse = {};

  try {
    if (isVideo && file.size > CHUNK_THRESHOLD_BYTES) {
      // Chunked unsigned upload for large videos (6 MB per chunk) so big clips never time out
      const totalSize = file.size;
      const uniqueUploadId = `rayon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      let start = 0;

      while (start < totalSize) {
        const end = Math.min(start + CHUNK_SIZE_BYTES, totalSize);
        const chunk = file.slice(start, end);
        const formData = new FormData();
        formData.append('file', chunk, resolvedName);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

        const chunkStart = start;
        data = await sendCloudinaryXhr(
          endpoint,
          formData,
          {
            'X-Unique-Upload-Id': uniqueUploadId,
            'Content-Range': `bytes ${chunkStart}-${end - 1}/${totalSize}`,
          },
          (loaded) => {
            const pct = Math.min(99, Math.round(((chunkStart + loaded) / totalSize) * 100));
            options?.onProgress?.(pct);
          }
        );

        start = end;
        options?.onProgress?.(Math.min(99, Math.round((start / totalSize) * 100)));
      }
    } else {
      const formData = new FormData();
      if (file instanceof File) {
        formData.append('file', file);
      } else {
        formData.append('file', file, resolvedName);
      }
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

      data = await sendCloudinaryXhr(endpoint, formData, undefined, (loaded, total) => {
        if (total > 0) {
          options?.onProgress?.(Math.min(99, Math.round((loaded / total) * 100)));
        }
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || 'Cloudinary upload failed.');
    throw new Error(message);
  }

  options?.onProgress?.(100);

  if (!data.secure_url || !data.secure_url.startsWith('https://')) {
    const errDetail = data.error?.message || 'Cloudinary did not return a valid media URL.';
    throw new Error(errDetail);
  }

  const isVideoResult = isVideo || data.resource_type === 'video';
  const finalUrl = isVideoResult ? normalizeCloudinaryVideoUrl(data.secure_url) : data.secure_url;
  const posterUrl = isVideoResult ? deriveCloudinaryVideoPoster(data.secure_url) : undefined;

  return {
    secureUrl: finalUrl,
    posterUrl,
    resourceType: data.resource_type || (isVideoResult ? 'video' : 'auto'),
    originalFilename: data.original_filename || resolvedName,
    bytes: data.bytes || file.size,
  };
}

/**
 * Subscribes to Firebase Admin Authentication state.
 */
export function subscribeAdminAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(portfolioAuth, callback);
}

/**
 * Signs in the portfolio admin using Firebase Email/Password Auth.
 */
export async function signInAdminWithEmail(email: string, password: string): Promise<User> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) {
    throw new Error('Please enter both your admin email and password.');
  }
  try {
    const cred = await signInWithEmailAndPassword(portfolioAuth, cleanEmail, password);
    return cred.user;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      throw new Error('Invalid admin email or password. Please try again.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Too many failed sign-in attempts. Please wait a moment and try again.');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error('Email/Password sign-in is not enabled in Firebase Authentication yet.');
    }
    throw new Error(err instanceof Error ? err.message : 'Unable to sign in right now.');
  }
}

/**
 * Signs out the portfolio admin.
 */
export async function signOutAdmin(): Promise<void> {
  await signOut(portfolioAuth);
}
