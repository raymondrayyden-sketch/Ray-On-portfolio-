import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type {
  AffiliationItem,
  PortfolioConfig,
  PortfolioCopy,
  PortfolioImages,
  PortfolioProfile,
  ProjectItem,
  ReelMotionType,
  TestimonialItem,
  ToolItem,
  VideoReelItem,
} from '../types/portfolio';
import { deepClone } from '../utils/svgArtwork';
import {
  deriveCloudinaryVideoPoster,
  isVideoFile,
  isVideoUrl,
  normalizeCloudinaryVideoUrl,
  optimizeCloudinaryUrl,
  uploadToCloudinary,
} from '../services/portfolioCloud';

export type StudioTab = 'copy' | 'items' | 'media' | 'publish';
export type CloudSyncState = 'idle' | 'loading' | 'saving' | 'synced' | 'error';

export type CollectionKey =
  | 'identityProjects'
  | 'flyerProjects'
  | 'videoReels'
  | 'photoProjects'
  | 'testimonials'
  | 'affiliations'
  | 'services'
  | 'tools';

interface StudioEditorDrawerProps {
  isOpen: boolean;
  initialTab?: StudioTab;
  initialCollection?: CollectionKey;
  onClose: () => void;
  config: PortfolioConfig;
  onUpdateConfig: (
    updater: (prev: PortfolioConfig) => PortfolioConfig,
    options?: { immediate?: boolean }
  ) => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  cloudState: CloudSyncState;
  storageStatus: string;
  onSaveNow: () => Promise<void>;
  onDownloadHtml: () => Promise<void>;
  onResetAll: () => void;
  showToast: (msg: string) => void;
  adminUser: User | null;
  onAdminSignOut: () => Promise<void>;
}

const PROFILE_FIELDS: Array<{ key: keyof PortfolioProfile; label: string; fullWidth?: boolean }> = [
  { key: 'name', label: 'Your Full Name' },
  { key: 'agency', label: 'Agency Name' },
  { key: 'currentRole', label: 'Role / Tagline Strip', fullWidth: true },
  { key: 'experience', label: 'Experience Badge' },
  { key: 'whatsappDisplay', label: 'WhatsApp Display Number' },
  { key: 'whatsappUrl', label: 'WhatsApp Link (wa.me)' },
  { key: 'email', label: 'Email Address' },
  { key: 'instagramHandle', label: 'Instagram Handle' },
  { key: 'instagramUrl', label: 'Instagram Profile URL', fullWidth: true },
];

const COPY_FIELDS: Array<{ key: keyof PortfolioCopy; label: string; multiline?: boolean }> = [
  { key: 'siteTitle', label: 'Browser Tab / SEO Title' },
  { key: 'navBrandName', label: 'Navbar Brand Title' },
  { key: 'navBrandSub', label: 'Navbar Subtitle' },
  { key: 'heroTopStrip', label: 'Hero Top Strip' },
  { key: 'heroCtaLabel', label: 'Hero Button Label' },
  { key: 'heroTitle', label: 'Hero Main Headline' },
  { key: 'heroSubtitle', label: 'Hero Subtitle' },
  { key: 'heroPortraitBadge', label: 'Hero Portrait Name Badge' },
  { key: 'heroTipText', label: 'Hero Interaction Tip' },
  { key: 'aboutHeading', label: 'Section 01 — About Heading' },
  { key: 'aboutBio1', label: 'About Paragraph 1 (supports **bold**)', multiline: true },
  { key: 'aboutBio2', label: 'About Paragraph 2 (supports **bold**)', multiline: true },
  { key: 'aboutBio3', label: 'About Paragraph 3 (supports **bold**)', multiline: true },
  { key: 'experienceHeading', label: 'Experience Heading' },
  { key: 'whatIDoHeading', label: 'What I Do Heading' },
  { key: 'toolsHeading', label: 'Tools Heading' },
  { key: 'toolsBadge', label: 'Tools Sub-Badge' },
  { key: 'qrCaption', label: 'QR Code Caption' },
  { key: 'brandingTitleAccent', label: 'Section 02 — Accent Title' },
  { key: 'brandingTitleRest', label: 'Section 02 — Main Title' },
  { key: 'brandingSubtitle', label: 'Section 02 — Subtitle', multiline: true },
  { key: 'flyersTitleAccent', label: 'Section 03 — Accent Title' },
  { key: 'flyersTitleRest', label: 'Section 03 — Main Title' },
  { key: 'flyersSubtitle', label: 'Section 03 — Subtitle', multiline: true },
  { key: 'videosTitleAccent', label: 'Section 04 — Accent Title' },
  { key: 'videosTitleRest', label: 'Section 04 — Main Title' },
  { key: 'videosSubtitle', label: 'Section 04 — Subtitle', multiline: true },
  { key: 'photoTitleAccent', label: 'Section 05 — Accent Title' },
  { key: 'photoTitleRest', label: 'Section 05 — Main Title' },
  { key: 'photoSubtitle', label: 'Section 05 — Subtitle', multiline: true },
  { key: 'retouchTitle', label: 'Retouch Showcase Title' },
  { key: 'retouchDesc', label: 'Retouch Showcase Description', multiline: true },
  { key: 'reviewsTitleAccent', label: 'Section 06 — Accent Title' },
  { key: 'reviewsTitleRest', label: 'Section 06 — Main Title' },
  { key: 'reviewsSubtitle', label: 'Section 06 — Subtitle' },
  { key: 'reviewsBadge', label: 'Reviews Rating Badge' },
  { key: 'closingThankYou', label: 'Closing Brush Script Heading', multiline: true },
  { key: 'closingSummary', label: 'Closing Summary Paragraph', multiline: true },
  { key: 'closingWhatsappCta', label: 'WhatsApp CTA Label' },
  { key: 'closingEmailCta', label: 'Email CTA Label' },
  { key: 'bookingHeading', label: 'Inquiry Form Heading' },
  { key: 'bookingSubheading', label: 'Inquiry Form Subheading' },
  { key: 'copyrightText', label: 'Footer Copyright Line' },
  { key: 'affiliationsHeading', label: 'Footer Marquee — Organizations Heading' },
];

const MOTION_TYPES: Array<{ value: ReelMotionType; label: string }> = [
  { value: 'giveday-wave', label: 'Giveday Wave' },
  { value: 'cosmetics-spotlight', label: 'Cosmetics Spotlight' },
  { value: 'fashion-glitch', label: 'Fashion Glitch' },
  { value: 'ugc-storyboard', label: 'UGC Storyboard' },
  { value: 'rayon-pulse', label: 'Ray-On Pulse' },
  { value: 'gala-pan', label: 'Gala Bokeh Pan' },
];

export function StudioEditorDrawer({
  isOpen,
  initialTab = 'copy',
  initialCollection,
  onClose,
  config,
  onUpdateConfig,
  editMode,
  onToggleEditMode,
  cloudState,
  storageStatus,
  onSaveNow,
  onDownloadHtml,
  onResetAll,
  showToast,
  adminUser,
  onAdminSignOut,
}: StudioEditorDrawerProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [activeCollection, setActiveCollection] = useState<CollectionKey>(
    initialCollection || 'identityProjects'
  );
  const [selectedMediaSlot, setSelectedMediaSlot] = useState<string>('image:heroPortrait');
  const [directUrlInput, setDirectUrlInput] = useState<string>('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isCvDragActive, setIsCvDragActive] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [uploadingProjectKey, setUploadingProjectKey] = useState<string | null>(null);
  const [galleryUrlDrafts, setGalleryUrlDrafts] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmResetStep, setConfirmResetStep] = useState(false);
  const [isExportingHtml, setIsExportingHtml] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialCollection) {
        setActiveCollection(initialCollection);
      }
      setUploadError(null);
    }
  }, [isOpen, initialTab, initialCollection]);

  const mediaSlots = useMemo(() => {
    const slots: Array<{ value: string; label: string }> = [
      { value: 'image:heroPortrait', label: 'Portrait — Hero Main Studio Portrait' },
      { value: 'image:aboutPortrait', label: 'Portrait — About Me Editorial Cutout' },
      { value: 'image:contactPortrait', label: 'Portrait — Closing Contact Cutout' },
      { value: 'image:logoPrimary', label: 'Logo — Ray-On Primary Color Logo' },
      { value: 'image:logoMonochrome', label: 'Logo — Ray-On Monochrome Watermark' },
      { value: 'image:qrCode', label: 'QR Code — Custom Instagram/Contact QR' },
      { value: 'image:retouchBefore', label: 'Retouch Slider — Before (Raw Photo)' },
      { value: 'image:retouchAfter', label: 'Retouch Slider — After (Graded Photo)' },
      { value: 'cv:fileUrl', label: 'CV / Résumé — PDF or Document Link' },
    ];
    config.identityProjects.forEach((p) => {
      slots.push({ value: `identity:${p.id}`, label: `Brand Tile — ${p.client}: ${p.title}` });
    });
    config.flyerProjects.forEach((p) => {
      slots.push({ value: `flyers:${p.id}`, label: `Flyer Tile — ${p.client}: ${p.title}` });
    });
    config.videoReels.forEach((v) => {
      slots.push({
        value: `video:${v.id}`,
        label: `Video Reel (MP4/MOV/WEBM/GIF) — ${v.client}: ${v.title}`,
      });
      slots.push({ value: `videoPoster:${v.id}`, label: `Video Reel Poster — ${v.client}: ${v.title}` });
    });
    config.photoProjects.forEach((p) => {
      slots.push({ value: `photos:${p.id}`, label: `Photo Gallery — ${p.client}: ${p.title}` });
    });
    (config.affiliations || []).forEach((a) => {
      slots.push({ value: `affiliation:${a.id}`, label: `Footer Org Logo — ${a.name}` });
    });
    return slots;
  }, [
    config.identityProjects,
    config.flyerProjects,
    config.videoReels,
    config.photoProjects,
    config.affiliations,
  ]);

  const applyMediaFile = async (file: File) => {
    const isVideo = isVideoFile(file, file.name);
    const [slotGroup, slotId] = selectedMediaSlot.split(':');

    if (isVideo && slotGroup !== 'video') {
      const msg =
        'You selected a video file, but Step 1 is currently pointed at an image/PDF slot. Switch Step 1 to a "Video Reel (MP4/MOV/WEBM/GIF)" slot first (or upload directly under Tab 2 → Section 04 — Motion & Video Reels).';
      setUploadError(msg);
      showToast('Select a Video Reel slot in Step 1 to upload a video.');
      return;
    }

    setUploadError(null);
    setUploadProgress(0);
    setIsUploadingMedia(true);
    showToast(`Uploading "${file.name}" to Cloudinary...`);

    try {
      // Send raw File directly via FormData (never FileReader.readAsDataURL)
      const uploaded = await uploadToCloudinary(file, file.name, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      const url = uploaded.secureUrl;
      const isUploadedVideo = isVideo || uploaded.resourceType === 'video';

      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          if (slotGroup === 'image') {
            next.images[slotId as keyof PortfolioImages] = url;
          } else if (slotGroup === 'cv') {
            next.cv = {
              fileUrl: url,
              fileName: file.name || prev.cv?.fileName || 'Raymond_Ajimuda_CV.pdf',
              buttonLabel: prev.cv?.buttonLabel || 'Download CV',
            };
          } else if (slotGroup === 'identity') {
            const item = next.identityProjects.find((x) => x.id === slotId);
            if (item) item.image = url;
          } else if (slotGroup === 'flyers') {
            const item = next.flyerProjects.find((x) => x.id === slotId);
            if (item) item.image = url;
          } else if (slotGroup === 'photos') {
            const item = next.photoProjects.find((x) => x.id === slotId);
            if (item) item.image = url;
          } else if (slotGroup === 'video') {
            const reel = next.videoReels.find((x) => x.id === slotId);
            if (reel) {
              if (isUploadedVideo) {
                reel.videoUrl = normalizeCloudinaryVideoUrl(url);
                reel.gifUrl = null;
                reel.posterUrl = uploaded.posterUrl || deriveCloudinaryVideoPoster(url) || reel.posterUrl;
              } else {
                reel.gifUrl = url;
                reel.videoUrl = null;
              }
            }
          } else if (slotGroup === 'videoPoster') {
            const reel = next.videoReels.find((x) => x.id === slotId);
            if (reel) reel.posterUrl = url;
          } else if (slotGroup === 'affiliation') {
            const aff = (next.affiliations || []).find((x) => x.id === slotId);
            if (aff) aff.logoUrl = url;
          }
          return next;
        },
        { immediate: true }
      );
      showToast(
        isUploadedVideo
          ? 'Video uploaded to Cloudinary with auto thumbnail & syncing to Firestore!'
          : 'Uploaded permanently to Cloudinary & syncing to Cloud!'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'Cloudinary upload failed.');
      setUploadError(msg);
      showToast(`Upload error: ${msg}`);
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(0);
    }
  };

  const handleSaveDirectUrl = () => {
    const trimmed = directUrlInput.trim();
    if (!trimmed) {
      const msg = 'Please paste a Cloudinary or HTTPS media URL first.';
      setUploadError(msg);
      showToast(msg);
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      const msg = 'URL must start with https:// or http:// (paste a direct Cloudinary or HTTPS link).';
      setUploadError(msg);
      showToast(msg);
      return;
    }

    setUploadError(null);
    const [slotGroup, slotId] = selectedMediaSlot.split(':');
    const urlIsVideo = isVideoUrl(trimmed);

    try {
      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          if (slotGroup === 'image') {
            next.images[slotId as keyof PortfolioImages] = trimmed;
          } else if (slotGroup === 'cv') {
            const guessedName = decodeURIComponent(trimmed.split('?')[0].split('/').pop() || '').trim();
            next.cv = {
              fileUrl: trimmed,
              fileName: guessedName || prev.cv?.fileName || 'Raymond_Ajimuda_CV.pdf',
              buttonLabel: prev.cv?.buttonLabel || 'Download CV',
            };
          } else if (slotGroup === 'identity') {
            const item = next.identityProjects.find((x) => x.id === slotId);
            if (item) item.image = trimmed;
          } else if (slotGroup === 'flyers') {
            const item = next.flyerProjects.find((x) => x.id === slotId);
            if (item) item.image = trimmed;
          } else if (slotGroup === 'photos') {
            const item = next.photoProjects.find((x) => x.id === slotId);
            if (item) item.image = trimmed;
          } else if (slotGroup === 'video') {
            const reel = next.videoReels.find((x) => x.id === slotId);
            if (reel) {
              if (urlIsVideo) {
                reel.videoUrl = normalizeCloudinaryVideoUrl(trimmed);
                reel.gifUrl = null;
                reel.posterUrl = deriveCloudinaryVideoPoster(trimmed) || reel.posterUrl;
              } else {
                reel.gifUrl = trimmed;
                reel.videoUrl = null;
              }
            }
          } else if (slotGroup === 'videoPoster') {
            const reel = next.videoReels.find((x) => x.id === slotId);
            if (reel) reel.posterUrl = trimmed;
          } else if (slotGroup === 'affiliation') {
            const aff = (next.affiliations || []).find((x) => x.id === slotId);
            if (aff) aff.logoUrl = trimmed;
          }
          return next;
        },
        { immediate: true }
      );
      setDirectUrlInput('');
      showToast('Direct Cloud URL saved to slot & syncing to Firestore!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'Failed to save URL to slot.');
      setUploadError(msg);
      showToast(msg);
    }
  };

  const applyCvFile = async (file: File) => {
    setUploadError(null);
    setIsUploadingCv(true);
    showToast(`Uploading CV "${file.name}" to Cloudinary...`);

    try {
      const uploaded = await uploadToCloudinary(file, file.name);
      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          next.cv = {
            fileUrl: uploaded.secureUrl,
            fileName: file.name || 'Raymond_Ajimuda_CV.pdf',
            buttonLabel: prev.cv?.buttonLabel || 'Download CV',
          };
          return next;
        },
        { immediate: true }
      );
      showToast(`CV uploaded permanently to Cloudinary (${file.name})!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'CV upload to Cloudinary failed.');
      setUploadError(msg);
      showToast(`CV upload error: ${msg}`);
    } finally {
      setIsUploadingCv(false);
    }
  };

  const handleProjectImageUpload = async (
    col: 'identityProjects' | 'flyerProjects' | 'photoProjects',
    index: number,
    file: File
  ) => {
    const key = `${col}-${index}`;
    setUploadError(null);
    setUploadingProjectKey(key);
    showToast(`Uploading "${file.name}" to Cloudinary...`);
    try {
      const uploaded = await uploadToCloudinary(file, file.name);
      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          if (next[col][index]) {
            next[col][index].image = uploaded.secureUrl;
          }
          return next;
        },
        { immediate: true }
      );
      showToast('Project image uploaded to Cloudinary!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'Upload failed.');
      setUploadError(msg);
      showToast(`Upload error: ${msg}`);
    } finally {
      setUploadingProjectKey(null);
    }
  };

  const handleVideoFileUpload = async (index: number, file: File) => {
    const key = `video-${index}`;
    const isVideo = isVideoFile(file, file.name);
    setUploadError(null);
    setUploadProgress(0);
    setUploadingProjectKey(key);
    showToast(`Uploading "${file.name}" to Cloudinary...`);
    try {
      // Send raw File directly via FormData (never FileReader.readAsDataURL)
      const uploaded = await uploadToCloudinary(file, file.name, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      const isUploadedVideo = isVideo || uploaded.resourceType === 'video';
      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          if (next.videoReels[index]) {
            if (isUploadedVideo) {
              next.videoReels[index].videoUrl = normalizeCloudinaryVideoUrl(uploaded.secureUrl);
              next.videoReels[index].gifUrl = null;
              next.videoReels[index].posterUrl =
                uploaded.posterUrl ||
                deriveCloudinaryVideoPoster(uploaded.secureUrl) ||
                next.videoReels[index].posterUrl;
            } else {
              next.videoReels[index].gifUrl = uploaded.secureUrl;
              next.videoReels[index].videoUrl = null;
            }
          }
          return next;
        },
        { immediate: true }
      );
      showToast('Video reel uploaded permanently to Cloudinary!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'Reel upload failed.');
      setUploadError(msg);
      showToast(`Reel upload error: ${msg}`);
    } finally {
      setUploadingProjectKey(null);
      setUploadProgress(0);
    }
  };

  const handleGalleryMediaUpload = async (
    col: 'identityProjects' | 'flyerProjects' | 'photoProjects' | 'videoReels',
    index: number,
    files: FileList
  ) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    const key = `gallery-${col}-${index}`;
    setUploadError(null);
    setUploadProgress(0);
    setUploadingProjectKey(key);
    showToast(
      `Uploading ${fileList.length} carousel slide${fileList.length === 1 ? '' : 's'} to Cloudinary...`
    );

    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const res = await uploadToCloudinary(f, f.name, {
          onProgress: (pct) => {
            const overall = Math.round(((i + pct / 100) / fileList.length) * 100);
            setUploadProgress(overall);
          },
        });
        uploadedUrls.push(res.secureUrl);
      }

      if (uploadedUrls.length > 0) {
        onUpdateConfig(
          (prev) => {
            const next = deepClone(prev);
            const target = next[col][index];
            if (target) {
              const current = Array.isArray(target.gallery) ? target.gallery : [];
              const merged = [...current];
              uploadedUrls.forEach((u) => {
                if (!merged.includes(u)) merged.push(u);
              });
              target.gallery = merged;
            }
            return next;
          },
          { immediate: true }
        );
        showToast(
          `Added ${uploadedUrls.length} slide${uploadedUrls.length === 1 ? '' : 's'} to tile carousel!`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err || 'Carousel upload failed.');
      setUploadError(msg);
      showToast(`Carousel upload error: ${msg}`);
    } finally {
      setUploadingProjectKey(null);
      setUploadProgress(0);
    }
  };

  const handleAddGalleryUrl = (
    col: 'identityProjects' | 'flyerProjects' | 'photoProjects' | 'videoReels',
    index: number,
    draftKey: string
  ) => {
    const raw = (galleryUrlDrafts[draftKey] || '').trim();
    if (!raw) {
      showToast('Paste an HTTPS media URL first.');
      return;
    }
    if (!/^https?:\/\//i.test(raw)) {
      showToast('Slide URL must start with https:// or http://');
      return;
    }
    const finalUrl = isVideoUrl(raw) ? normalizeCloudinaryVideoUrl(raw) : raw;
    onUpdateConfig(
      (prev) => {
        const next = deepClone(prev);
        const target = next[col][index];
        if (target) {
          const current = Array.isArray(target.gallery) ? target.gallery : [];
          if (!current.includes(finalUrl)) {
            target.gallery = [...current, finalUrl];
          }
        }
        return next;
      },
      { immediate: true }
    );
    setGalleryUrlDrafts((prev) => ({ ...prev, [draftKey]: '' }));
    showToast('Added slide URL to tile carousel!');
  };

  const renderCarouselManager = (
    col: 'identityProjects' | 'flyerProjects' | 'photoProjects' | 'videoReels',
    itemId: string,
    index: number,
    gallery: string[] | undefined
  ) => {
    const slides = Array.isArray(gallery) ? gallery : [];
    const uploadKey = `gallery-${col}-${index}`;
    const draftKey = `${col}:${itemId}`;
    const isUploadingThis = uploadingProjectKey === uploadKey;

    const moveSlide = (slideIdx: number, dir: -1 | 1) => {
      const targetIdx = slideIdx + dir;
      if (targetIdx < 0 || targetIdx >= slides.length) return;
      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          const arr = Array.isArray(next[col][index]?.gallery) ? [...(next[col][index].gallery || [])] : [];
          const [moved] = arr.splice(slideIdx, 1);
          arr.splice(targetIdx, 0, moved);
          next[col][index].gallery = arr;
          return next;
        },
        { immediate: true }
      );
    };

    const removeSlide = (slideIdx: number) => {
      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          const arr = Array.isArray(next[col][index]?.gallery) ? [...(next[col][index].gallery || [])] : [];
          arr.splice(slideIdx, 1);
          next[col][index].gallery = arr;
          return next;
        },
        { immediate: true }
      );
      showToast('Removed carousel slide');
    };

    return (
      <div className="pt-2.5 mt-1 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-white block">
              Carousel Slides ({slides.length + 1} total)
            </span>
            <span className="text-[10px] text-zinc-400">
              Add extra similar images or clips to enable auto-swipe &amp; manual swipe on this tile.
            </span>
          </div>
          <label className="px-2.5 py-1.5 rounded-lg bg-crimson/20 hover:bg-crimson border border-crimson/45 text-[10px] font-bold text-white cursor-pointer transition-colors shrink-0">
            <span>{isUploadingThis ? `${uploadProgress}%...` : '+ Add Media'}</span>
            <input
              type="file"
              multiple
              accept="image/*,image/gif,video/*,.mp4,.mov,.webm,.m4v"
              disabled={isUploadingThis}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleGalleryMediaUpload(col, index, e.target.files);
                }
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {isUploadingThis && (
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-crimson transition-all duration-200"
              style={{ width: `${Math.max(8, uploadProgress)}%` }}
            />
          </div>
        )}

        {slides.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {slides.map((url, sIdx) => {
              const vid = isVideoUrl(url);
              const thumb = vid
                ? deriveCloudinaryVideoPoster(url) || ''
                : optimizeCloudinaryUrl(url, 180) || url;
              return (
                <div
                  key={`${itemId}-g-${sIdx}`}
                  className="group relative w-16 rounded-xl bg-obsidian border border-white/15 p-1 space-y-1"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-zinc-900">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={`Slide ${sIdx + 2}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-400">
                        #{sIdx + 2}
                      </div>
                    )}
                    {vid && (
                      <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/75 text-[8px] font-bold text-white">
                        VID
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-0.5">
                    <button
                      type="button"
                      disabled={sIdx === 0}
                      onClick={() => moveSlide(sIdx, -1)}
                      aria-label="Move slide left"
                      className="flex-1 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-[9px] font-bold text-white"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      disabled={sIdx === slides.length - 1}
                      onClick={() => moveSlide(sIdx, 1)}
                      aria-label="Move slide right"
                      className="flex-1 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-[9px] font-bold text-white"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(sIdx)}
                      aria-label="Remove slide"
                      className="px-1 py-0.5 rounded bg-red-950/80 hover:bg-crimson text-[9px] font-bold text-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <input
            type="url"
            value={galleryUrlDrafts[draftKey] || ''}
            onChange={(e) =>
              setGalleryUrlDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddGalleryUrl(col, index, draftKey);
              }
            }}
            placeholder="Or paste extra slide URL (Cloudinary image/video)..."
            className="flex-1 min-w-0 rounded-lg bg-obsidian border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-crimson"
          />
          <button
            type="button"
            onClick={() => handleAddGalleryUrl(col, index, draftKey)}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-crimson text-[10px] font-bold text-white transition-colors shrink-0"
          >
            + URL
          </button>
        </div>
      </div>
    );
  };

  const handleAffiliationLogoUpload = async (index: number, file: File) => {
    const key = `affiliation-${index}`;
    setUploadError(null);
    setUploadProgress(0);
    setUploadingProjectKey(key);
    showToast(`Uploading logo "${file.name}" to Cloudinary...`);
    try {
      const uploaded = await uploadToCloudinary(file, file.name, {
        onProgress: (pct) => setUploadProgress(pct),
      });
      onUpdateConfig(
        (prev) => {
          const next = deepClone(prev);
          if (next.affiliations[index]) {
            next.affiliations[index].logoUrl = uploaded.secureUrl;
          }
          return next;
        },
        { immediate: true }
      );
      showToast('Organization logo uploaded permanently to Cloudinary!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logo upload failed.';
      setUploadError(msg);
      showToast(msg);
    } finally {
      setUploadingProjectKey(null);
      setUploadProgress(0);
    }
  };

  const handleAddCollectionItem = () => {
    const uid = `${Date.now().toString(36)}`;
    onUpdateConfig((prev) => {
      const next = deepClone(prev);
      if (activeCollection === 'identityProjects') {
        next.identityProjects.unshift({
          id: `id-${uid}`,
          client: 'New Brand Client',
          category: 'Startup',
          title: 'Visual Identity & Social Suite',
          role: 'Creative Director',
          deliverables: ['Brand Identity', 'Social Templates'],
          summary: 'Describe the brand challenge, creative direction, and impact delivered.',
          image: null,
          artKey: 'rayon-guide',
        });
      } else if (activeCollection === 'flyerProjects') {
        next.flyerProjects.unshift({
          id: `fl-${uid}`,
          client: 'New Campaign',
          category: 'Events',
          title: 'High-Impact Promo Flyer',
          role: 'Visual Designer',
          deliverables: ['Event Flyer', 'Story Cutdowns'],
          summary: 'High-contrast promotional visual engineered to stop the scroll.',
          image: null,
          artKey: 'flyer-rayon-workshop',
        });
      } else if (activeCollection === 'videoReels') {
        next.videoReels.unshift({
          id: `vid-${uid}`,
          client: 'New Video Client',
          category: 'AI Ads',
          title: 'New Motion / AI Ad Reel',
          toolTag: 'Kling + CapCut',
          duration: '0:12 GIF',
          role: 'AI Video Director',
          deliverables: ['AI Video Ad', 'Kinetic Edit'],
          summary: 'Short-form AI commercial reel designed for maximum retention.',
          posterUrl: null,
          gifUrl: null,
          videoUrl: null,
          motionType: 'rayon-pulse',
        });
      } else if (activeCollection === 'photoProjects') {
        next.photoProjects.unshift({
          id: `ph-${uid}`,
          client: 'New Photo Shoot',
          category: 'Studio Portrait',
          title: 'Editorial Retouch & Color Grade',
          role: 'Photographer & Retoucher',
          deliverables: ['Studio Lighting', 'Color Grading'],
          summary: 'Studio photography capture and editorial color polish.',
          image: null,
          artKey: 'photo-crimson',
        });
      } else if (activeCollection === 'testimonials') {
        next.testimonials.unshift({
          quote: 'Raymond delivered outstanding creative direction and fast turnaround for our brand launch.',
          author: 'Client Name',
          brand: 'Brand Name',
          sector: 'Industry Sector',
          rating: 5,
        });
      } else if (activeCollection === 'affiliations') {
        next.affiliations.unshift({
          id: `aff-${uid}`,
          name: 'New Organization',
          role: 'Creative Partner',
          logoUrl: null,
          websiteUrl: '',
          lightLogoBg: false,
        });
      } else if (activeCollection === 'services') {
        next.services.push('New Creative Service');
      } else if (activeCollection === 'tools') {
        next.tools.push({
          id: `tool-${uid}`,
          name: 'New Tool',
          bg: '#18181b',
          border: '#E60A15',
          color: '#FFFFFF',
          badge: 'NT',
        });
      }
      return next;
    });
    showToast('Added new item!');
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rayon-portfolio-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded!');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as Partial<PortfolioConfig>;
        if (!parsed.profile || !parsed.copy) {
          showToast('Invalid backup JSON format.');
          return;
        }
        onUpdateConfig((prev) => ({
          ...prev,
          ...parsed,
          profile: { ...prev.profile, ...parsed.profile },
          copy: { ...prev.copy, ...parsed.copy },
          images: { ...prev.images, ...(parsed.images || {}) },
        }));
        showToast('Backup restored successfully!');
      } catch {
        showToast('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadHtmlClick = async () => {
    setIsExportingHtml(true);
    try {
      await onDownloadHtml();
    } finally {
      setIsExportingHtml(false);
    }
  };

  const renderProjectCardEditor = (
    col: 'identityProjects' | 'flyerProjects' | 'photoProjects',
    item: ProjectItem,
    index: number
  ) => {
    const isHidden = Boolean(item.hidden);
    return (
      <div
        key={item.id}
        className={`rounded-2xl p-3.5 space-y-2.5 border transition-all ${
          isHidden
            ? 'bg-white/[0.02] border-dashed border-white/15 opacity-70'
            : 'bg-white/[0.04] border-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-bold text-white truncate">
              {item.client} — <span className="text-zinc-400 font-normal">{item.title}</span>
            </span>
            {isHidden && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-white/15 text-[9px] font-bold uppercase tracking-wider text-zinc-300 shrink-0">
                Hidden
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextHidden = !isHidden;
                onUpdateConfig(
                  (prev) => {
                    const next = deepClone(prev);
                    if (next[col][index]) next[col][index].hidden = nextHidden;
                    return next;
                  },
                  { immediate: true }
                );
                showToast(nextHidden ? 'Tile hidden from live site' : 'Tile visible on live site');
              }}
              title={isHidden ? 'Show tile on site' : 'Hide tile from site'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                isHidden
                  ? 'bg-zinc-900 hover:bg-emerald-600/30 text-zinc-300 border-white/20'
                  : 'bg-emerald-500/15 hover:bg-zinc-800 text-emerald-300 border-emerald-400/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isHidden ? 'bg-zinc-500' : 'bg-emerald-400'}`}
              />
              <span>{isHidden ? 'Off' : 'On'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateConfig((prev) => {
                  const next = deepClone(prev);
                  next[col].splice(index, 1);
                  return next;
                });
                showToast('Item removed');
              }}
              className="px-2.5 py-1 rounded-full bg-red-950/70 hover:bg-crimson text-[10px] font-bold text-white shrink-0"
            >
              Delete
            </button>
          </div>
        </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={item.client}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next[col][index].client = e.target.value;
              return next;
            })
          }
          placeholder="Client Name"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <input
          type="text"
          value={item.category}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next[col][index].category = e.target.value;
              return next;
            })
          }
          placeholder="Category"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
      </div>
      <input
        type="text"
        value={item.title}
        onChange={(e) =>
          onUpdateConfig((prev) => {
            const next = deepClone(prev);
            next[col][index].title = e.target.value;
            return next;
          })
        }
        placeholder="Project Title"
        className="w-full rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={item.role}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next[col][index].role = e.target.value;
              return next;
            })
          }
          placeholder="Role"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <input
          type="text"
          value={item.deliverables.join(', ')}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next[col][index].deliverables = e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              return next;
            })
          }
          placeholder="Deliverables (comma-separated)"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
      </div>
      <textarea
        rows={2}
        value={item.summary}
        onChange={(e) =>
          onUpdateConfig((prev) => {
            const next = deepClone(prev);
            next[col][index].summary = e.target.value;
            return next;
          })
        }
        placeholder="Summary"
        className="w-full rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
      />
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={item.image || ''}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next[col][index].image = e.target.value.trim() || null;
              return next;
            })
          }
          placeholder="Cloudinary URL or upload →"
          className="flex-1 min-w-0 rounded-lg bg-obsidian border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-crimson"
        />
        <label className="px-2.5 py-1.5 rounded-lg bg-crimson/20 hover:bg-crimson border border-crimson/45 text-[10px] font-bold text-white cursor-pointer transition-colors shrink-0">
          <span>{uploadingProjectKey === `${col}-${index}` ? 'Uploading...' : 'Upload'}</span>
          <input
            type="file"
            accept="image/*,image/gif,.svg"
            disabled={uploadingProjectKey === `${col}-${index}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleProjectImageUpload(col, index, file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={Boolean(item.lightBg)}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next[col][index].lightBg = e.target.checked;
              return next;
            })
          }
          className="rounded border-white/25 bg-obsidian accent-crimson"
        />
        <span>Use white backdrop behind image (best for dark transparent logos)</span>
      </label>
      {renderCarouselManager(col, item.id, index, item.gallery)}
    </div>
    );
  };

  const renderVideoCardEditor = (item: VideoReelItem, index: number) => {
    const isHidden = Boolean(item.hidden);
    return (
      <div
        key={item.id}
        className={`rounded-2xl p-3.5 space-y-2.5 border transition-all ${
          isHidden
            ? 'bg-white/[0.02] border-dashed border-white/15 opacity-70'
            : 'bg-white/[0.04] border-white/10'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs font-bold text-white truncate">
              {item.client} — <span className="text-zinc-400 font-normal">{item.title}</span>
            </span>
            {isHidden && (
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-white/15 text-[9px] font-bold uppercase tracking-wider text-zinc-300 shrink-0">
                Hidden
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextHidden = !isHidden;
                onUpdateConfig(
                  (prev) => {
                    const next = deepClone(prev);
                    if (next.videoReels[index]) next.videoReels[index].hidden = nextHidden;
                    return next;
                  },
                  { immediate: true }
                );
                showToast(nextHidden ? 'Reel hidden from live site' : 'Reel visible on live site');
              }}
              title={isHidden ? 'Show reel on site' : 'Hide reel from site'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                isHidden
                  ? 'bg-zinc-900 hover:bg-emerald-600/30 text-zinc-300 border-white/20'
                  : 'bg-emerald-500/15 hover:bg-zinc-800 text-emerald-300 border-emerald-400/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isHidden ? 'bg-zinc-500' : 'bg-emerald-400'}`}
              />
              <span>{isHidden ? 'Off' : 'On'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateConfig((prev) => {
                  const next = deepClone(prev);
                  next.videoReels.splice(index, 1);
                  return next;
                });
                showToast('Reel removed');
              }}
              className="px-2.5 py-1 rounded-full bg-red-950/70 hover:bg-crimson text-[10px] font-bold text-white shrink-0"
            >
              Delete
            </button>
          </div>
        </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={item.client}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.videoReels[index].client = e.target.value;
              return next;
            })
          }
          placeholder="Client"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <input
          type="text"
          value={item.category}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.videoReels[index].category = e.target.value;
              return next;
            })
          }
          placeholder="Category (AI Ads, UGC...)"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
      </div>
      <input
        type="text"
        value={item.title}
        onChange={(e) =>
          onUpdateConfig((prev) => {
            const next = deepClone(prev);
            next.videoReels[index].title = e.target.value;
            return next;
          })
        }
        placeholder="Reel Title"
        className="w-full rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={item.toolTag}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.videoReels[index].toolTag = e.target.value;
              return next;
            })
          }
          placeholder="Tool Tag"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <input
          type="text"
          value={item.duration}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.videoReels[index].duration = e.target.value;
              return next;
            })
          }
          placeholder="Duration"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <select
          value={item.motionType}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.videoReels[index].motionType = e.target.value as ReelMotionType;
              return next;
            })
          }
          className="rounded-lg bg-obsidian border border-white/15 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        >
          {MOTION_TYPES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        rows={2}
        value={item.summary}
        onChange={(e) =>
          onUpdateConfig((prev) => {
            const next = deepClone(prev);
            next.videoReels[index].summary = e.target.value;
            return next;
          })
        }
        placeholder="Reel summary"
        className="w-full rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={item.gifUrl || ''}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.videoReels[index].gifUrl = e.target.value.trim() || null;
              return next;
            })
          }
          placeholder="GIF filename / URL"
          className="rounded-lg bg-obsidian border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-crimson"
        />
        <input
          type="text"
          value={item.videoUrl || ''}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.videoReels[index].videoUrl = e.target.value.trim() || null;
              return next;
            })
          }
          placeholder="MP4 / WEBM Cloudinary URL"
          className="rounded-lg bg-obsidian border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-crimson"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-zinc-400">
            Supports MP4, MOV (iPhone/Mac), WEBM, M4V, MKV &amp; GIF (up to 100 MB)
          </span>
          <label className="px-3 py-1.5 rounded-lg bg-crimson/20 hover:bg-crimson border border-crimson/45 text-[10px] font-bold text-white cursor-pointer transition-colors shrink-0">
            <span>
              {uploadingProjectKey === `video-${index}`
                ? `Uploading ${uploadProgress}%...`
                : 'Upload Video / GIF'}
            </span>
            <input
              type="file"
              accept="video/*,.mp4,.mov,.webm,.m4v,.avi,.mkv,image/gif,.gif"
              disabled={uploadingProjectKey === `video-${index}`}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleVideoFileUpload(index, file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {uploadingProjectKey === `video-${index}` && (
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-crimson transition-all duration-200"
              style={{ width: `${Math.max(5, uploadProgress)}%` }}
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer select-none pt-0.5">
          <input
            type="checkbox"
            checked={Boolean(item.lightBg)}
            onChange={(e) =>
              onUpdateConfig((prev) => {
                const next = deepClone(prev);
                next.videoReels[index].lightBg = e.target.checked;
                return next;
              })
            }
            className="rounded border-white/25 bg-obsidian accent-crimson"
          />
          <span>Use white backdrop behind GIF/poster (best for dark transparent logos)</span>
        </label>
        {renderCarouselManager('videoReels', item.id, index, item.gallery)}
      </div>
    </div>
    );
  };

  const renderTestimonialEditor = (item: TestimonialItem, index: number) => (
    <div key={index} className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white">{item.brand}</span>
        <button
          type="button"
          onClick={() => {
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.testimonials.splice(index, 1);
              return next;
            });
            showToast('Review removed');
          }}
          className="px-2.5 py-1 rounded-full bg-red-950/70 hover:bg-crimson text-[10px] font-bold text-white"
        >
          Delete
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={item.brand}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.testimonials[index].brand = e.target.value;
              return next;
            })
          }
          placeholder="Brand Name"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <input
          type="text"
          value={item.author}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.testimonials[index].author = e.target.value;
              return next;
            })
          }
          placeholder="Author"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={item.sector}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.testimonials[index].sector = e.target.value;
              return next;
            })
          }
          placeholder="Sector"
          className="col-span-2 rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <select
          value={item.rating}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.testimonials[index].rating = Number(e.target.value);
              return next;
            })
          }
          className="rounded-lg bg-obsidian border border-white/15 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        >
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} Stars
            </option>
          ))}
        </select>
      </div>
      <textarea
        rows={3}
        value={item.quote}
        onChange={(e) =>
          onUpdateConfig((prev) => {
            const next = deepClone(prev);
            next.testimonials[index].quote = e.target.value;
            return next;
          })
        }
        placeholder="Client quote"
        className="w-full rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
      />
    </div>
  );

  const renderAffiliationEditor = (item: AffiliationItem, index: number) => {
    const isUploadingThis = uploadingProjectKey === `affiliation-${index}`;
    const total = config.affiliations.length;

    const moveItem = (dir: -1 | 1) => {
      const targetIdx = index + dir;
      if (targetIdx < 0 || targetIdx >= total) return;
      onUpdateConfig((prev) => {
        const next = deepClone(prev);
        const [moved] = next.affiliations.splice(index, 1);
        next.affiliations.splice(targetIdx, 0, moved);
        return next;
      });
    };

    return (
      <div
        key={item.id}
        className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center p-1.5 border shrink-0 overflow-hidden ${
                item.logoUrl && item.lightLogoBg
                  ? 'bg-white border-white/80'
                  : 'bg-obsidian border-white/15'
              }`}
            >
              {item.logoUrl ? (
                <img
                  src={item.logoUrl}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="font-syne text-xs font-extrabold text-crimson">
                  {item.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0] || '')
                    .join('')
                    .toUpperCase() || 'ORG'}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-white truncate">{item.name}</span>
              <span className="block text-[10px] text-zinc-400 truncate">
                {item.logoUrl ? 'Logo uploaded' : 'No logo uploaded yet'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => moveItem(-1)}
              aria-label="Move up"
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-bold text-white"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={() => moveItem(1)}
              aria-label="Move down"
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-bold text-white"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateConfig((prev) => {
                  const next = deepClone(prev);
                  next.affiliations.splice(index, 1);
                  return next;
                });
                showToast('Organization removed');
              }}
              className="px-2.5 py-1 rounded-full bg-red-950/70 hover:bg-crimson text-[10px] font-bold text-white ml-1"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={item.name}
            onChange={(e) =>
              onUpdateConfig((prev) => {
                const next = deepClone(prev);
                next.affiliations[index].name = e.target.value;
                return next;
              })
            }
            placeholder="Organization Name (tooltip & alt)"
            className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
          />
          <input
            type="url"
            value={item.websiteUrl || ''}
            onChange={(e) =>
              onUpdateConfig((prev) => {
                const next = deepClone(prev);
                next.affiliations[index].websiteUrl = e.target.value.trim();
                return next;
              })
            }
            placeholder="Optional Website URL (https://...)"
            className="rounded-lg bg-obsidian border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-crimson"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={item.logoUrl || ''}
            onChange={(e) =>
              onUpdateConfig((prev) => {
                const next = deepClone(prev);
                next.affiliations[index].logoUrl = e.target.value.trim() || null;
                return next;
              })
            }
            placeholder="Logo URL or upload PNG/SVG/JPG →"
            className="flex-1 min-w-0 rounded-lg bg-obsidian border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-crimson"
          />
          <label className="px-3 py-1.5 rounded-lg bg-crimson/25 hover:bg-crimson border border-crimson/50 text-[10px] font-bold text-white cursor-pointer transition-colors shrink-0">
            <span>{isUploadingThis ? `${uploadProgress}%...` : 'Upload Logo'}</span>
            <input
              type="file"
              accept="image/*,.png,.svg,.webp,.jpg,.jpeg"
              disabled={isUploadingThis}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleAffiliationLogoUpload(index, file);
                e.target.value = '';
              }}
            />
          </label>
          {item.logoUrl && (
            <button
              type="button"
              onClick={() =>
                onUpdateConfig((prev) => {
                  const next = deepClone(prev);
                  next.affiliations[index].logoUrl = null;
                  return next;
                })
              }
              title="Clear logo"
              className="px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-zinc-300 shrink-0"
            >
              Clear
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(item.lightLogoBg)}
            onChange={(e) =>
              onUpdateConfig((prev) => {
                const next = deepClone(prev);
                next.affiliations[index].lightLogoBg = e.target.checked;
                return next;
              })
            }
            className="rounded border-white/25 bg-obsidian accent-crimson"
          />
          <span>Use white backdrop behind logo (best for dark-colored transparent logos)</span>
        </label>
      </div>
    );
  };

  const renderToolEditor = (item: ToolItem, index: number) => (
    <div key={item.id} className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-white">{item.name}</span>
        <button
          type="button"
          onClick={() => {
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.tools.splice(index, 1);
              return next;
            });
            showToast('Tool removed');
          }}
          className="px-2.5 py-1 rounded-full bg-red-950/70 hover:bg-crimson text-[10px] font-bold text-white"
        >
          Delete
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={item.name}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.tools[index].name = e.target.value;
              return next;
            })
          }
          placeholder="Tool Name"
          className="col-span-2 rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
        <input
          type="text"
          value={item.badge}
          onChange={(e) =>
            onUpdateConfig((prev) => {
              const next = deepClone(prev);
              next.tools[index].badge = e.target.value;
              return next;
            })
          }
          placeholder="Badge"
          className="rounded-lg bg-obsidian border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-crimson"
        />
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div
      id="studioDrawerBackdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl bg-[#120607] border-l border-crimson/50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-syne text-lg sm:text-xl font-extrabold text-white">No-Code Site Editor</h3>
            <p className="text-[11px] text-zinc-400 truncate">
              {adminUser?.email
                ? `Admin: ${adminUser.email} · Synced to Firebase & Cloudinary`
                : 'Edit any word, project, review, or media — synced to Cloud.'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {adminUser && (
              <button
                type="button"
                onClick={() => void onAdminSignOut()}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-red-950 hover:border-red-500/50 border border-white/15 text-[11px] font-semibold text-zinc-200 hover:text-white transition-colors"
                title="Sign out of Admin Studio"
              >
                Sign Out
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Editor"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-crimson text-white flex items-center justify-center transition-colors shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* On-Page Click-to-Edit Quick Toggle */}
        <div className="px-4 sm:px-5 py-3 bg-crimson/10 border-b border-crimson/25 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-bold text-white block">Click-to-Edit Text Directly on Page</span>
            <span className="text-[11px] text-zinc-300">
              Turn on to click headlines &amp; paragraphs on the site and type.
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleEditMode}
            className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all shrink-0 ${
              editMode
                ? 'bg-crimson text-white border-white/40 shadow-lg shadow-crimson/40'
                : 'bg-white/10 hover:bg-crimson text-white border-white/20'
            }`}
          >
            {editMode ? 'Turn OFF' : 'Turn ON'}
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-white/10 flex flex-wrap gap-1.5 bg-obsidian/40">
          {(
            [
              ['copy', '1. Text & Links'],
              ['items', '2. Projects & Reviews'],
              ['media', '3. Media & CV'],
              ['publish', '4. Save & Publish'],
            ] as Array<[StudioTab, string]>
          ).map(([tabKey, label]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => {
                setActiveTab(tabKey);
                setConfirmResetStep(false);
              }}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                activeTab === tabKey
                  ? 'bg-crimson text-white'
                  : 'bg-white/10 text-zinc-300 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: TEXT & LINKS */}
          {activeTab === 'copy' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
                <h4 className="text-xs font-montserrat font-extrabold uppercase tracking-wider text-crimson">
                  Profile, Links &amp; Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PROFILE_FIELDS.map((field) => (
                    <div key={field.key} className={field.fullWidth ? 'sm:col-span-2' : ''}>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={config.profile[field.key]}
                        onChange={(e) =>
                          onUpdateConfig((prev) => ({
                            ...prev,
                            profile: { ...prev.profile, [field.key]: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-montserrat font-extrabold uppercase tracking-wider text-crimson">
                    All Website Copy
                  </h4>
                  <span className="text-[10px] text-zinc-400">Use **bold** or *italic* in bios</span>
                </div>
                <div className="space-y-3">
                  {COPY_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <textarea
                          rows={3}
                          value={config.copy[field.key]}
                          onChange={(e) =>
                            onUpdateConfig((prev) => ({
                              ...prev,
                              copy: { ...prev.copy, [field.key]: e.target.value },
                            }))
                          }
                          className="w-full rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                        />
                      ) : (
                        <input
                          type="text"
                          value={config.copy[field.key]}
                          onChange={(e) =>
                            onUpdateConfig((prev) => ({
                              ...prev,
                              copy: { ...prev.copy, [field.key]: e.target.value },
                            }))
                          }
                          className="w-full rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTS & REVIEWS */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={activeCollection}
                  onChange={(e) => setActiveCollection(e.target.value as CollectionKey)}
                  className="flex-1 min-w-[200px] rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-crimson"
                >
                  <option value="identityProjects">Section 02 — Brand &amp; Social Media</option>
                  <option value="flyerProjects">Section 03 — Campaign Flyers</option>
                  <option value="videoReels">Section 04 — Motion &amp; Video Reels</option>
                  <option value="photoProjects">Section 05 — Photography Gallery</option>
                  <option value="testimonials">Section 06 — Client Reviews</option>
                  <option value="affiliations">Footer — Affiliated Organizations (Rolling Logos)</option>
                  <option value="services">Section 01 — What I Do (Services)</option>
                  <option value="tools">Section 01 — Tools Stack</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddCollectionItem}
                  className="px-4 py-2.5 rounded-xl bg-crimson hover:bg-red-600 text-xs font-bold text-white transition-colors"
                >
                  + Add New
                </button>
              </div>

              {(activeCollection === 'identityProjects' ||
                activeCollection === 'flyerProjects' ||
                activeCollection === 'videoReels' ||
                activeCollection === 'photoProjects') && (() => {
                const colItems = config[activeCollection] as Array<{ hidden?: boolean }>;
                const visibleCount = colItems.filter((x) => !x.hidden).length;
                return (
                  <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 flex items-center justify-between gap-2 text-[11px] text-zinc-300">
                    <span>
                      <strong className="text-white">{visibleCount}</strong> of{' '}
                      <strong className="text-white">{colItems.length}</strong> tiles visible on site
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Toggle On/Off per tile • Add multiple slides for carousel
                    </span>
                  </div>
                );
              })()}

              {uploadError && (
                <div className="rounded-xl bg-red-950/80 border border-red-500/50 p-3 flex items-start justify-between gap-2 text-xs text-red-100">
                  <div className="space-y-1">
                    <p className="font-bold text-white">Upload Issue</p>
                    <p className="leading-relaxed text-red-200">{uploadError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadError(null)}
                    className="text-red-300 hover:text-white text-xs font-bold px-1.5"
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {(activeCollection === 'identityProjects' ||
                  activeCollection === 'flyerProjects' ||
                  activeCollection === 'photoProjects') &&
                  config[activeCollection].map((item, i) =>
                    renderProjectCardEditor(activeCollection, item, i)
                  )}

                {activeCollection === 'videoReels' &&
                  config.videoReels.map((item, i) => renderVideoCardEditor(item, i))}

                {activeCollection === 'testimonials' &&
                  config.testimonials.map((item, i) => renderTestimonialEditor(item, i))}

                {activeCollection === 'affiliations' &&
                  (config.affiliations || []).map((item, i) => renderAffiliationEditor(item, i))}

                {activeCollection === 'services' &&
                  config.services.map((srv, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={srv}
                        onChange={(e) =>
                          onUpdateConfig((prev) => {
                            const next = deepClone(prev);
                            next.services[i] = e.target.value;
                            return next;
                          })
                        }
                        className="flex-1 rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateConfig((prev) => {
                            const next = deepClone(prev);
                            next.services.splice(i, 1);
                            return next;
                          });
                          showToast('Service removed');
                        }}
                        className="px-3 py-2 rounded-xl bg-red-950/70 hover:bg-crimson text-[11px] font-bold text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                {activeCollection === 'tools' &&
                  config.tools.map((tool, i) => renderToolEditor(tool, i))}
              </div>
            </div>
          )}

          {/* TAB 3: MEDIA & CV */}
          {activeTab === 'media' && (
            <div className="space-y-5">
              {/* CV / Résumé Upload Card */}
              <div className="rounded-2xl bg-gradient-to-br from-crimson/15 via-white/[0.04] to-obsidian border border-crimson/40 p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-montserrat font-extrabold uppercase tracking-wider text-crimson">
                      CV / Résumé Upload
                    </h4>
                    <p className="text-[11px] text-zinc-300 mt-0.5">
                      Upload your PDF or Word CV so visitors can download it from your About &amp; Contact sections.
                    </p>
                  </div>
                  {config.cv?.fileUrl && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-[10px] font-bold text-emerald-300 whitespace-nowrap">
                      CV Active
                    </span>
                  )}
                </div>

                {config.cv?.fileUrl ? (
                  <div className="rounded-xl bg-obsidian/80 border border-white/15 p-3 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-crimson/20 border border-crimson/40 text-crimson flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {config.cv.fileName || 'Uploaded CV'}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {config.cv.fileUrl.includes('res.cloudinary.com')
                            ? 'Stored permanently in Cloudinary & synced to Cloud'
                            : config.cv.fileUrl}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={config.cv.fileUrl}
                        download={config.cv.fileName || 'Raymond_Ajimuda_CV.pdf'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition-colors"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateConfig(
                            (prev) => ({
                              ...prev,
                              cv: { ...prev.cv, fileUrl: null, fileName: '' },
                            }),
                            { immediate: true }
                          );
                          showToast('CV removed');
                        }}
                        className="px-3 py-1.5 rounded-full bg-red-950/70 hover:bg-crimson text-[11px] font-bold text-white transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}

                <label
                  htmlFor="cvFileInput"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCvDragActive(true);
                  }}
                  onDragLeave={() => setIsCvDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsCvDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && !isUploadingCv) void applyCvFile(file);
                  }}
                  className={`flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed border-crimson/55 bg-obsidian/50 hover:bg-crimson/10 cursor-pointer transition-all px-4 text-center ${
                    isCvDragActive ? 'dropzone-active' : ''
                  } ${isUploadingCv ? 'opacity-70 pointer-events-none' : ''}`}
                >
                  {isUploadingCv ? (
                    <>
                      <span className="w-7 h-7 rounded-full border-2 border-crimson/30 border-t-crimson animate-spin mb-2" />
                      <span className="text-xs font-bold text-white">Uploading CV to Cloudinary...</span>
                      <span className="text-[10px] text-zinc-400 mt-1">Please wait while your file uploads</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-7 h-7 text-crimson mb-1.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <path d="M12 18v-6" />
                        <path d="m9 15 3-3 3 3" />
                      </svg>
                      <span className="text-xs font-semibold text-white">
                        {config.cv?.fileUrl
                          ? 'Click or drop to replace CV (PDF / DOC / DOCX)'
                          : 'Drag & drop your CV here or click to browse'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-1">
                        Uploads permanently to Cloudinary &amp; syncs across all devices
                      </span>
                    </>
                  )}
                  <input
                    id="cvFileInput"
                    type="file"
                    disabled={isUploadingCv}
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void applyCvFile(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="cvButtonLabelInput" className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      CV Button Label
                    </label>
                    <input
                      id="cvButtonLabelInput"
                      type="text"
                      value={config.cv?.buttonLabel ?? 'Download CV'}
                      onChange={(e) =>
                        onUpdateConfig((prev) => ({
                          ...prev,
                          cv: { ...prev.cv, buttonLabel: e.target.value },
                        }))
                      }
                      placeholder="Download CV"
                      className="w-full rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvExternalUrlInput" className="block text-[11px] font-semibold text-zinc-300 mb-1">
                      Or Paste External CV Link (URL)
                    </label>
                    <input
                      id="cvExternalUrlInput"
                      type="url"
                      value={
                        config.cv?.fileUrl && !config.cv.fileUrl.startsWith('data:') && !config.cv.fileUrl.startsWith('blob:')
                          ? config.cv.fileUrl
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        onUpdateConfig((prev) => ({
                          ...prev,
                          cv: {
                            ...prev.cv,
                            fileUrl: val || null,
                            fileName: val ? prev.cv.fileName || 'Raymond_Ajimuda_CV.pdf' : '',
                          },
                        }));
                      }}
                      placeholder="https://... (Cloudinary, Drive, PDF URL)"
                      className="w-full rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                    />
                  </div>
                </div>
              </div>

              {/* Swap Site Media Card */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-4">
                <h4 className="text-xs font-montserrat font-extrabold uppercase tracking-wider text-crimson">
                  Swap Photos, Logos &amp; Video Reels (Cloudinary)
                </h4>
                <div>
                  <label
                    htmlFor="swapTargetSelect"
                    className="block text-xs font-montserrat font-bold uppercase tracking-wider text-zinc-300 mb-2"
                  >
                    1. Select Photo, Logo, PDF, QR, or Reel Slot
                  </label>
                  <select
                    id="swapTargetSelect"
                    value={selectedMediaSlot}
                    onChange={(e) => setSelectedMediaSlot(e.target.value)}
                    className="w-full rounded-xl bg-obsidian border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-crimson"
                  >
                    {mediaSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>

                  {(() => {
                    const [slotGroup, slotId] = selectedMediaSlot.split(':');
                    if (slotGroup === 'cv') return null;
                    const isLightBackdrop =
                      slotGroup === 'image'
                        ? Boolean(config.imageLightBg?.[slotId])
                        : slotGroup === 'identity'
                          ? Boolean(config.identityProjects.find((x) => x.id === slotId)?.lightBg)
                          : slotGroup === 'flyers'
                            ? Boolean(config.flyerProjects.find((x) => x.id === slotId)?.lightBg)
                            : slotGroup === 'photos'
                              ? Boolean(config.photoProjects.find((x) => x.id === slotId)?.lightBg)
                              : slotGroup === 'video' || slotGroup === 'videoPoster'
                                ? Boolean(config.videoReels.find((x) => x.id === slotId)?.lightBg)
                                : slotGroup === 'affiliation'
                                  ? Boolean((config.affiliations || []).find((x) => x.id === slotId)?.lightLogoBg)
                                  : false;

                    return (
                      <label className="mt-2.5 flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer select-none rounded-xl bg-obsidian/60 border border-white/10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isLightBackdrop}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            onUpdateConfig((prev) => {
                              const next = deepClone(prev);
                              if (slotGroup === 'image') {
                                next.imageLightBg = { ...(next.imageLightBg || {}), [slotId]: checked };
                              } else if (slotGroup === 'identity') {
                                const item = next.identityProjects.find((x) => x.id === slotId);
                                if (item) item.lightBg = checked;
                              } else if (slotGroup === 'flyers') {
                                const item = next.flyerProjects.find((x) => x.id === slotId);
                                if (item) item.lightBg = checked;
                              } else if (slotGroup === 'photos') {
                                const item = next.photoProjects.find((x) => x.id === slotId);
                                if (item) item.lightBg = checked;
                              } else if (slotGroup === 'video' || slotGroup === 'videoPoster') {
                                const reel = next.videoReels.find((x) => x.id === slotId);
                                if (reel) reel.lightBg = checked;
                              } else if (slotGroup === 'affiliation') {
                                const aff = (next.affiliations || []).find((x) => x.id === slotId);
                                if (aff) aff.lightLogoBg = checked;
                              }
                              return next;
                            });
                          }}
                          className="rounded border-white/25 bg-obsidian accent-crimson"
                        />
                        <span>
                          Use white backdrop behind this slot (best for dark-colored transparent logos)
                        </span>
                      </label>
                    );
                  })()}
                </div>

                <div>
                  <label
                    htmlFor="swapFileInput"
                    className="block text-xs font-montserrat font-bold uppercase tracking-wider text-zinc-300 mb-2"
                  >
                    2. Drag &amp; Drop or Pick Media File
                  </label>
                  <label
                    htmlFor="swapFileInput"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragActive(true);
                    }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file && !isUploadingMedia) void applyMediaFile(file);
                    }}
                    className={`flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-crimson/55 bg-crimson/5 hover:bg-crimson/10 cursor-pointer transition-all px-4 text-center ${
                      isDragActive ? 'dropzone-active' : ''
                    } ${isUploadingMedia ? 'opacity-70 pointer-events-none' : ''}`}
                  >
                    {isUploadingMedia ? (
                      <>
                        <span className="w-8 h-8 rounded-full border-2 border-crimson/30 border-t-crimson animate-spin mb-2" />
                        <span className="text-xs font-bold text-white">
                          Uploading media to Cloudinary... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                        </span>
                        <div className="w-48 h-1.5 rounded-full bg-white/15 overflow-hidden mt-2">
                          <div
                            className="h-full bg-crimson transition-all duration-200"
                            style={{ width: `${Math.max(6, uploadProgress)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-1.5">
                          Saving permanent HTTPS URL to Firebase Cloud
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-8 h-8 text-crimson mb-2"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="text-xs font-semibold text-white">
                          Drop PNG, JPG, SVG, WEBP, GIF, MP4, MOV, WEBM or PDF here
                        </span>
                        <span className="text-[11px] text-zinc-400 mt-1">
                          Videos up to 100 MB upload via chunked Cloudinary streaming!
                        </span>
                      </>
                    )}
                    <input
                      id="swapFileInput"
                      type="file"
                      disabled={isUploadingMedia}
                      accept="image/*,image/gif,video/*,.mp4,.mov,.webm,.m4v,.avi,.mkv,application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void applyMediaFile(file);
                        e.target.value = '';
                      }}
                    />
                  </label>

                  {/* 3. Paste Direct Cloud URL */}
                  <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2">
                    <label
                      htmlFor="directCloudUrlInput"
                      className="block text-xs font-montserrat font-bold uppercase tracking-wider text-zinc-300"
                    >
                      3. Or Paste Direct Cloud URL
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="directCloudUrlInput"
                        type="url"
                        value={directUrlInput}
                        onChange={(e) => setDirectUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveDirectUrl();
                          }
                        }}
                        placeholder="https://res.cloudinary.com/urwej0rr/..."
                        className="flex-1 rounded-xl bg-obsidian border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-crimson"
                      />
                      <button
                        id="saveDirectUrlBtn"
                        type="button"
                        onClick={handleSaveDirectUrl}
                        className="px-4 py-2 rounded-xl bg-crimson hover:bg-red-600 text-xs font-bold text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        Save URL to Slot
                      </button>
                    </div>
                    <p className="text-[10.5px] text-zinc-400">
                      Paste any existing Cloudinary image, PDF, or video URL to assign it to the selected slot and sync to Firestore immediately.
                    </p>
                  </div>

                  {uploadError && (
                    <div className="mt-3 rounded-xl bg-red-950/80 border border-red-500/50 p-3 flex items-start justify-between gap-2 text-xs text-red-100">
                      <div className="space-y-1">
                        <p className="font-bold text-white">Upload Issue</p>
                        <p className="leading-relaxed text-red-200">{uploadError}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadError(null)}
                        className="text-red-300 hover:text-white text-xs font-bold px-1.5"
                        aria-label="Dismiss error"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Manage Footer Affiliated Organization Logos right under Media Upload */}
              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-montserrat font-extrabold uppercase tracking-wider text-crimson">
                      Footer Organization Logos (Rolling Strip)
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Add, upload, or reorder affiliated organization logos shown in the footer marquee.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const uid = `${Date.now().toString(36)}`;
                      onUpdateConfig((prev) => {
                        const next = deepClone(prev);
                        next.affiliations.unshift({
                          id: `aff-${uid}`,
                          name: 'New Organization',
                          role: 'Creative Partner',
                          logoUrl: null,
                          websiteUrl: '',
                          lightLogoBg: false,
                        });
                        return next;
                      });
                      showToast('Added new organization slot!');
                    }}
                    className="px-3 py-1.5 rounded-full bg-crimson hover:bg-red-600 text-[11px] font-bold text-white transition-colors shrink-0"
                  >
                    + Add Logo
                  </button>
                </div>

                {uploadError && (
                  <div className="rounded-xl bg-red-950/80 border border-red-500/50 p-3 flex items-start justify-between gap-2 text-xs text-red-100">
                    <div className="space-y-1">
                      <p className="font-bold text-white">Upload Issue</p>
                      <p className="leading-relaxed text-red-200">{uploadError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadError(null)}
                      className="text-red-300 hover:text-white text-xs font-bold px-1.5"
                      aria-label="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="space-y-2.5">
                  {(config.affiliations || []).length === 0 ? (
                    <p className="text-xs text-zinc-400 py-2">
                      No organization logos yet. Click <strong className="text-white">+ Add Logo</strong> above to add one.
                    </p>
                  ) : (
                    (config.affiliations || []).map((item, i) => renderAffiliationEditor(item, i))
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-2 text-xs text-zinc-300 leading-relaxed">
                <p className="font-bold text-white">Permanent Cloud Storage Active:</p>
                <p>
                  • Every image, GIF, video reel, and PDF CV uploaded here is hosted permanently on{' '}
                  <code className="text-white">Cloudinary</code> and its secure HTTPS link is saved to{' '}
                  <code className="text-white">Firebase Firestore (portfolio/main)</code>.
                  <br />• Every visitor on phone, tablet, or desktop immediately sees your live updates without re-deploying.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SAVE & PUBLISH */}
          {activeTab === 'publish' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-crimson/20 to-obsidian border border-crimson/45 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-syne text-lg font-extrabold text-white">
                    Live Cloud Sync (Firebase Firestore)
                  </h4>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      cloudState === 'synced'
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                        : cloudState === 'saving'
                          ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                          : cloudState === 'error'
                            ? 'bg-red-500/20 border-red-400/50 text-red-200'
                            : 'bg-white/10 border-white/20 text-zinc-300'
                    }`}
                  >
                    {cloudState === 'saving' && (
                      <span className="w-2.5 h-2.5 rounded-full border border-amber-300/40 border-t-amber-300 animate-spin" />
                    )}
                    {cloudState === 'synced' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                    <span>{storageStatus}</span>
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-200">
                  Every edit and Cloudinary upload is automatically saved to Firestore document{' '}
                  <code className="text-white">portfolio/main</code> so every visitor sees your live updates instantly.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={cloudState === 'saving'}
                    onClick={() => void onSaveNow()}
                    className="flex-1 min-w-[180px] btn-crimson-pill py-3 px-5 rounded-full text-xs font-montserrat font-extrabold tracking-wider text-obsidian shadow-lg shadow-crimson/40 disabled:opacity-60"
                  >
                    {cloudState === 'saving' ? 'SAVING TO CLOUD...' : 'SYNC TO CLOUD NOW'}
                  </button>
                  <button
                    type="button"
                    disabled={isExportingHtml}
                    onClick={handleDownloadHtmlClick}
                    className="px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white transition-colors disabled:opacity-60"
                  >
                    {isExportingHtml ? 'Baking...' : 'Download index.html'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
                <h4 className="text-xs font-montserrat font-extrabold uppercase tracking-wider text-white">
                  Backup / Restore Content (.json)
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                  >
                    Export Backup (.json)
                  </button>
                  <label className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer transition-colors">
                    <span>Restore Backup (.json)</span>
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={handleImportJson}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.03] border border-red-500/25 p-4 space-y-2.5">
                <h4 className="text-xs font-montserrat font-extrabold uppercase tracking-wider text-red-400">
                  Reset to Original Defaults
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Restores the default Ray-On copy, projects, and media and syncs defaults back to Firestore.
                </p>
                {!confirmResetStep ? (
                  <button
                    type="button"
                    onClick={() => setConfirmResetStep(true)}
                    className="px-4 py-2 rounded-full bg-red-950/60 hover:bg-crimson border border-red-500/40 text-xs font-bold text-white transition-colors"
                  >
                    Reset All Edits
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResetAll();
                        setConfirmResetStep(false);
                      }}
                      className="px-4 py-2 rounded-full bg-crimson hover:bg-red-600 text-xs font-bold text-white transition-colors"
                    >
                      Confirm: Restore Defaults Now
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetStep(false)}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3 bg-obsidian/70">
          <div className="flex items-center gap-2 min-w-0">
            {cloudState === 'saving' ? (
              <span className="w-3 h-3 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin shrink-0" />
            ) : cloudState === 'synced' ? (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            ) : cloudState === 'error' ? (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 shrink-0" />
            )}
            <span
              className={`text-[11px] font-semibold truncate ${
                cloudState === 'synced'
                  ? 'text-emerald-300'
                  : cloudState === 'saving'
                    ? 'text-amber-300'
                    : cloudState === 'error'
                      ? 'text-red-300'
                      : 'text-zinc-400'
              }`}
            >
              {storageStatus}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={cloudState === 'saving'}
              onClick={() => void onSaveNow()}
              className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-crimson hover:bg-red-600 text-xs font-bold text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
