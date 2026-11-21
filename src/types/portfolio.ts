export interface PortfolioProfile {
  name: string;
  agency: string;
  currentRole: string;
  experience: string;
  whatsappDisplay: string;
  whatsappUrl: string;
  email: string;
  instagramHandle: string;
  instagramUrl: string;
  qrApiUrl: string;
}

export interface PortfolioCopy {
  siteTitle: string;
  navBrandName: string;
  navBrandSub: string;
  navAbout: string;
  navBranding: string;
  navFlyers: string;
  navVideos: string;
  navPhotography: string;
  navReviews: string;
  heroCtaLabel: string;
  heroTopStrip: string;
  heroTipText: string;
  heroPortraitBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutEyebrowLeft: string;
  aboutEyebrowRight: string;
  aboutHeading: string;
  aboutBio1: string;
  aboutBio2: string;
  aboutBio3: string;
  aboutPortraitHint: string;
  experienceHeading: string;
  whatIDoHeading: string;
  contactHeading: string;
  toolsHeading: string;
  toolsBadge: string;
  qrCaption: string;
  brandingEyebrowLeft: string;
  brandingEyebrowRight: string;
  brandingTitleAccent: string;
  brandingTitleRest: string;
  brandingSubtitle: string;
  flyersEyebrowLeft: string;
  flyersEyebrowRight: string;
  flyersTitleAccent: string;
  flyersTitleRest: string;
  flyersSubtitle: string;
  videosEyebrowLeft: string;
  videosEyebrowRight: string;
  videosTitleAccent: string;
  videosTitleRest: string;
  videosSubtitle: string;
  photoEyebrowLeft: string;
  photoEyebrowRight: string;
  photoTitleAccent: string;
  photoTitleRest: string;
  photoSubtitle: string;
  retouchBeforeLabel: string;
  retouchAfterLabel: string;
  retouchBadge: string;
  retouchTitle: string;
  retouchDesc: string;
  retouchTag1: string;
  retouchTag2: string;
  retouchTag3: string;
  retouchTag4: string;
  reviewsEyebrowLeft: string;
  reviewsEyebrowRight: string;
  reviewsTitleAccent: string;
  reviewsTitleRest: string;
  reviewsSubtitle: string;
  reviewsBadge: string;
  closingThankYou: string;
  closingSummary: string;
  closingWhatsappCta: string;
  closingEmailCta: string;
  bookingHeading: string;
  bookingSubheading: string;
  affiliationsHeading: string;
  affiliationsSubheading: string;
  copyrightText: string;
}

export interface PortfolioImages {
  heroPortrait: string | null;
  aboutPortrait: string | null;
  aboutPortraitFallback: string | null;
  bentoPortrait: string | null;
  contactPortrait: string | null;
  logoPrimary: string | null;
  logoMonochrome: string | null;
  qrCode: string | null;
  retouchBefore: string | null;
  retouchAfter: string | null;
}

export interface ToolItem {
  id: string;
  name: string;
  bg: string;
  border: string;
  color: string;
  badge: string;
}

export interface ProjectItem {
  id: string;
  client: string;
  category: string;
  title: string;
  role: string;
  deliverables: string[];
  summary: string;
  image: string | null;
  fallbackImage?: string | null;
  artKey: string;
  lightBg?: boolean;
}

export type ReelMotionType =
  | 'giveday-wave'
  | 'cosmetics-spotlight'
  | 'fashion-glitch'
  | 'ugc-storyboard'
  | 'rayon-pulse'
  | 'gala-pan';

export interface VideoReelItem {
  id: string;
  client: string;
  category: string;
  title: string;
  toolTag: string;
  duration: string;
  role: string;
  deliverables: string[];
  summary: string;
  posterUrl: string | null;
  gifUrl: string | null;
  videoUrl: string | null;
  motionType: ReelMotionType;
  lightBg?: boolean;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  brand: string;
  sector: string;
  rating: number;
}

export interface PortfolioCV {
  fileUrl: string | null;
  fileName: string;
  buttonLabel: string;
}

export interface AffiliationItem {
  id: string;
  name: string;
  role: string;
  logoUrl: string | null;
  websiteUrl?: string;
  lightLogoBg?: boolean;
}

export interface PortfolioConfig {
  profile: PortfolioProfile;
  copy: PortfolioCopy;
  images: PortfolioImages;
  imageLightBg?: Record<string, boolean>;
  cv: PortfolioCV;
  services: string[];
  tools: ToolItem[];
  identityProjects: ProjectItem[];
  flyerProjects: ProjectItem[];
  videoReels: VideoReelItem[];
  photoProjects: ProjectItem[];
  testimonials: TestimonialItem[];
  affiliations: AffiliationItem[];
}

export type LightboxSectionType = 'identity' | 'flyers' | 'videos' | 'photos';

export interface LightboxSelection {
  sectionType: LightboxSectionType;
  projectId: string;
}
