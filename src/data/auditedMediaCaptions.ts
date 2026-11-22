import type { ProjectItem, VideoReelItem } from '../types/portfolio';

export interface AuditedProjectMeta {
  client: string;
  category: string;
  title: string;
  role: string;
  deliverables: string[];
  summary: string;
}

export interface AuditedVideoMeta extends AuditedProjectMeta {
  toolTag: string;
  duration: string;
}

/**
 * Legacy default placeholder titles that shipped before media was uploaded.
 * We only auto-upgrade a Firestore tile's metadata if its current title is still
 * one of these untouched defaults, so any manual edits the admin saves later are always respected.
 */
export const LEGACY_PLACEHOLDER_TITLES = new Set<string>([
  // Identity defaults
  'Product & Content Innovation Suite',
  'Apparel Brand Identity & Lookbook',
  'Luxury Accessories & Promo System',
  'Luxury Event Planning Brand Identity',
  'Cosmetics & Beauty Visual Identity',
  'Ray-On Identity & AI Visual Lab',
  'High-Converting Ad Carousels',
  'Seasonal Editorial Social Feed',
  'Radiance Cosmetics Product Launch',
  // Flyer defaults
  'Fund Your Dream Campaign Poster',
  'Royal Gala Night Luxury Flyer',
  'Black Friday Luxury Drop Flyer',
  'Runway Capsule Pop-Up Poster',
  'Glow Masterclass & Beauty Fair',
  'Switch Your Brand ON Workshop',
  'Destination Wedding Showcase',
  'Signature Timepiece Promo Flyer',
  'Community Impact Milestone Flyer',
  // Video reel defaults
  'Giveday Launch Commercial AI Reel',
  'Radiance Cosmetics Cinematic AI Ad',
  'Luxury Drop Kinetic Promo Cut',
  'Apparel Styling & Try-On UGC Reel',
  'Ray-On Power-Nib Logo Reveal',
  'VIP Gala Highlight Recap Loop',
  // Photography defaults
  'Crimson Spotlight Low-Key Portrait',
  'Cultural Elegance Cutout & Compositing',
  'Noir Timepiece Macro Lighting',
  'Candlelit Gala Atmosphere Edit',
]);

/**
 * Audited captions & tags keyed by unique Cloudinary asset public ID
 * based on direct visual inspection of each uploaded file.
 */
export const AUDITED_PROJECT_BY_ASSET: Record<string, AuditedProjectMeta> = {
  // Section 02 — Brand & Social Media
  yy57gh6durnvapnmk7rd: {
    client: 'Giveday',
    category: 'Brand Identity',
    title: 'Knotted-Heart Brand Mark & Wordmark',
    role: 'Brand & Content Innovation Associate',
    deliverables: ['Brand Mark', 'Logo Lockup', 'Color System'],
    summary:
      'Primary brand identity lockup for Giveday pairing a vibrant violet knotted-heart emblem with a clean geometric lowercase wordmark set on deep midnight purple.',
  },
  wjfwkjjz9g2jaezfzmkd: {
    client: 'Dunni Wears',
    category: 'Fashion',
    title: 'Coat-Hanger & Threaded-Needle Logo',
    role: 'Lead Brand Designer',
    deliverables: ['Apparel Logo', 'Custom Typography', 'Brand Mark'],
    summary:
      'Distinctive apparel identity for Dunni Wears uniting a sleek black coat hanger, bold uppercase DUNNI lettering, and a threaded-needle script signature.',
  },
  dmv7u45toub5fauymdcr: {
    client: 'Bolex Collection',
    category: 'Luxury',
    title: '3D Gold Chain-Link Monogram Identity',
    role: 'Lead Brand Designer',
    deliverables: ['3D Metallic Monogram', 'Luxury Wordmark', 'Brand Emblem'],
    summary:
      'Opulent 3D metallic gold B monogram intertwined with a sculpted chain link and refined serif wordmark crafted for Bolex Collection’s luxury fabrics and jewelry.',
  },
  hhrbctkciq0zvlbdccg6: {
    client: 'Spark by Debby',
    category: 'Bakery & Pastries',
    title: 'Cupcake Swirl & Gold Star Bakery Logo',
    role: 'Brand Identity Designer',
    deliverables: ['Bakery Logo', 'Custom Emblem', 'Contact Lockup'],
    summary:
      'Playful yet regal black-and-gold bakery identity for Spark by Debby featuring a negative-space S frosting swirl, golden star spark accent, and script signature.',
  },
  wtk0mtlvcjeggkrgpg69: {
    client: 'MARBIK Signatures',
    category: 'Beauty',
    title: 'Glam Silhouette Circular Beauty Emblem',
    role: 'Lead Brand Designer',
    deliverables: ['Beauty Emblem', 'Circular Stamp Logo', 'Salon Branding'],
    summary:
      'Circular salon emblem for MARBIK Signatures illustrating flowing hair, vibrant violet lips, and manicured nails framed with arched serif and cursive typography.',
  },
  bur3yb9wiygqjoxp0vfx: {
    client: 'Ray-On Brand Agency',
    category: 'Agency',
    title: 'Power-Nib Monochrome Agency Mark',
    role: 'Founder & Creative Director',
    deliverables: ['Power-Nib Emblem', 'Monochrome Lockup', 'Agency Identity'],
    summary:
      'Minimalist white-on-black agency emblem fusing a power-on ring with a precision fountain-pen nib—symbolizing fearless creative strategy switched ON.',
  },
  a3mu5s2y7gwqg9wft8ub: {
    client: 'ÀbíCARE Signatures',
    category: 'Beauty',
    title: 'Three-Direction Logo Concept Exploration',
    role: 'Brand Identity Designer',
    deliverables: ['Logo Concepts (x3)', 'Negative-Space Marks', 'Serif Wordmark'],
    summary:
      'Three distinct monochrome logo explorations for ÀbíCARE Signatures—pairing negative-space crimson lips, a minimalist arch monogram, and a flowing-hair profile silhouette.',
  },
  sz7knwjpvqcfpngjweea: {
    client: 'Dam’s Casuals',
    category: 'Fashion',
    title: 'Embroidered Denim Label & DC Monogram',
    role: 'Apparel Brand Designer',
    deliverables: ['DC Hanger Monogram', 'Woven Patch Mockup', 'Clothing Label'],
    summary:
      'Tactile streetwear identity for Dam’s Casuals uniting an intertwined DC coat-hanger monogram and serif wordmark showcased as an embroidered woven denim patch.',
  },
  efslunosxl01h1vhxcgq: {
    client: 'Bolex Collection',
    category: 'Packaging',
    title: 'Gold-Foil Luxury Boutique Gift Bag',
    role: 'Packaging & Brand Designer',
    deliverables: ['Boutique Packaging', 'Gold Foil Stamping', 'Retail Carrier'],
    summary:
      'Bespoke champagne-cream boutique gift bag for Bolex Collection finished with gold-foil B monogram stamping, braided gold rope handles, and a satin ribbon bow.',
  },

  // Section 03 — Flyers & Campaign Visuals
  wwgy6vwdm88cvqbbwhuv: {
    client: 'Giveday',
    category: 'Awareness',
    title: 'Breast Cancer Awareness Month Campaign',
    role: 'Product & Content Innovation Associate',
    deliverables: ['Awareness Poster', 'Social Campaign Visual'],
    summary:
      'Heartfelt rose-pink awareness poster for Giveday featuring cupped hands cradling a pink ribbon with clean editorial typography reminding audiences that early detection saves lives.',
  },
  adldgogmzhyje1qfrthu: {
    client: 'House of Jouir',
    category: 'AI Product Ad',
    title: 'Feu Doux Holiday Eau de Parfum Visual',
    role: 'AI Creative Director',
    deliverables: ['AI Product Staging', 'Festive Campaign Visual'],
    summary:
      'Warm holiday product visual staging House of Jouir’s Feu Doux 100ml Eau de Parfum suspended by a gold ribbon on a glowing Christmas tree beside a cozy fireplace.',
  },
  qwztluzgutrqjixectbf: {
    client: 'Bolex Collection',
    category: 'Fashion & Fabrics',
    title: 'Elegance in Every Fabric Catalog Flyer',
    role: 'Visual Designer',
    deliverables: ['Catalog Promo Flyer', '8-Collection Showcase'],
    summary:
      'Regal gold-and-ivory campaign flyer showcasing Bolex Collection’s Senator materials, Men & Women Lace, Adire, Kapala, Cashmere, Beaded Lace, and luxury jewelry.',
  },
  tfnon2syp5lh1u5fyquk: {
    client: 'Dunni Wears',
    category: 'Fashion',
    title: 'Women & Children Collection Store Flyer',
    role: 'Visual Designer',
    deliverables: ['Boutique Promo Flyer', 'Collection Iconography'],
    summary:
      'Coordinated lavender mother-and-daughter store flyer highlighting Dunni Wears’ Dresses, Tops & Blouses, Skirts, Jumpsuits, and Casual & Office Wear in Abuja.',
  },
  se6dfqjqy14qioh0iq6v: {
    client: 'MARBIK Signatures',
    category: 'Beauty',
    title: 'Wigs, Lashes, Nails & Make-Up Salon Flyer',
    role: 'Creative Director',
    deliverables: ['Salon Showcase Flyer', '4-Service Collage'],
    summary:
      'Luxurious plum-and-gold salon flyer pairing a 4-panel visual strip of wigs, lashes, nail artistry, and makeup glam with the tagline “Your Beauty, Our Signature.”',
  },
  sfzctn8dwapg90ldkese: {
    client: 'The Cornerstone × YTOP Global',
    category: 'Community Event',
    title: 'TAPAI — Talk & Pray About It (PCOS) Flyer',
    role: 'Event Graphic Designer',
    deliverables: ['Speaker Lineup Flyer', 'Event Promo Graphic'],
    summary:
      'Co-branded community advocacy and prayer event poster featuring moderator, convener, and PCOS advocate portraits framed by crimson ribbons with full Ile-Ife venue details.',
  },
  os3pwjsjq0t2xchtfaha: {
    client: 'Giveday × Tunani',
    category: 'Partnership',
    title: 'Official Partnership — Let’s Vote 9ja',
    role: 'Product & Content Innovation Associate',
    deliverables: ['Partnership Announcement', 'Editorial Photo Composite'],
    summary:
      'Overhead editorial campaign visual announcing the Giveday × Tunani partnership for Let’s Vote 9ja, featuring two women in Nigerian attire shaking hands across a map-branded table.',
  },
  atdntgzb6cngvcilxbgl: {
    client: 'Giveday',
    category: 'Brand Campaign',
    title: 'Put Your Cause in Focus — Conceptual Ad',
    role: 'Product & Content Innovation Associate',
    deliverables: ['Conceptual Brand Ad', 'Visual Storytelling'],
    summary:
      'Clever depth-of-field brand visual where blurred copy (“Many causes need help.”) snaps into sharp clarity through purple Giveday eyeglasses reading “but not every cause gets seen.”',
  },
  fqutrtj7eoqyrainz4r0: {
    client: 'Giveday',
    category: 'Launch Teaser',
    title: 'We Are This Close to Launch — Africa Teaser',
    role: 'Product & Content Innovation Associate',
    deliverables: ['Pre-Launch Teaser Poster', 'Social Countdown Art'],
    summary:
      'Bold midnight-purple launch teaser featuring a pinching hand hovering over Nigeria on an outlined map of Africa where the glowing violet Giveday emblem sits.',
  },

  // Section 05 — Mobile Photography & Retouching
  x8rgaibpjzte5an6v5ek: {
    client: 'Mobile Photography',
    category: 'Landscape',
    title: 'Crossroads & Lone Tree Under Cobalt Sky',
    role: 'Mobile Photographer & Colorist',
    deliverables: ['Symmetrical Framing', 'Mobile Capture', 'Sky & Contrast Grade'],
    summary:
      'One-point perspective mobile landscape splitting symmetrically down a white road divider toward a solitary tall tree silhouetted beneath dramatic cobalt clouds.',
  },
  tobbe36tbuveotr0hsdu: {
    client: 'Mobile Photography',
    category: 'Outdoor Portrait',
    title: 'Park Bench Streetwear Lifestyle Shot',
    role: 'Mobile Photographer & Editor',
    deliverables: ['Natural Light Portrait', 'Earth-Tone Grade', 'Depth Bokeh'],
    summary:
      'Dynamic outdoor mobile portrait capturing warm earth-toned streetwear perched atop a wrought-iron wooden park bench against lush, softly blurred greenery.',
  },
  gjjhpx0rhrkmftutpzan: {
    client: 'Mobile Photography',
    category: 'Celebration Portrait',
    title: 'White Cutwork Lace & Gold Glam Portrait',
    role: 'Mobile Photographer & Retoucher',
    deliverables: ['Natural Daylight Capture', 'Skin & Highlight Balance', 'Crisp Detail Edit'],
    summary:
      'Radiant daylight mobile portrait balancing intricate white eyelet lace highlights, sculptural gold tassel earrings, and warm luminous skin tones.',
  },
  r5zkctrq8g8gfirb32sb: {
    client: 'Mobile Photography',
    category: 'Cultural Portrait',
    title: 'Aso-Oke Gele & White Lace Child Portrait',
    role: 'Mobile Photographer & Colorist',
    deliverables: ['Portrait Mode Bokeh', 'Cultural Textile Color', 'Soft Natural Retouch'],
    summary:
      'Candid shallow-depth-of-field mobile portrait spotlighting a richly woven orange, navy, and white Aso-Oke gele paired with delicate white eyelet lace.',
  },
};

export const AUDITED_VIDEO_BY_ASSET: Record<string, AuditedVideoMeta> = {
  jpdt7cmul4fezvqkukwo: {
    client: 'Giveday',
    category: 'AI Ads',
    title: 'NGO Donation Tracking AI UGC Commercial',
    toolTag: 'Creatify + AI UGC',
    duration: '0:15 Reel',
    role: 'AI Video Creator & Scriptwriter',
    deliverables: ['AI Spokesperson Ad', 'Caption Styling', 'NGO Conversion Hook'],
    summary:
      'Conversational AI UGC spokesperson reel built for Giveday addressing NGOs—combining natural office framing and bold purple subtitle hooks to pitch effortless donation tracking.',
  },
  uypbvqt6ovqklbiy3vhk: {
    client: 'Evelyn Ajimuda',
    category: 'Motion Design',
    title: 'The Weight of Loving You — Audio Visualizer',
    toolTag: 'Motion + Waveform',
    duration: '0:12 Reel',
    role: 'Motion Designer',
    deliverables: ['Audiogram Visualizer', 'Cover Art Motion', 'Waveform Sync'],
    summary:
      'Atmospheric dark-mode audio promo for Evelyn Ajimuda’s “The Weight of Loving You,” pairing split-portrait cover art with a live reactive waveform and crimson contour lines.',
  },
  nshcpcimv2nsaie4djk4: {
    client: 'Bolex Collection',
    category: 'Motion Design',
    title: '3D Metallic Gold Monogram Logo Reveal',
    toolTag: 'AI Motion + CapCut',
    duration: '0:10 Reel',
    role: 'Motion Designer & Video Editor',
    deliverables: ['3D Logo Reveal', 'Gold Particle FX', 'Brand Outro'],
    summary:
      'Luxurious gold-foil motion ident sweeping through embossed chain textures to reveal the Bolex Collection B monogram, wordmark, and boutique hotline with shimmering embers.',
  },
  xxdws5otrbo3uguxlhp8: {
    client: 'Dunni Wears',
    category: 'Motion Design',
    title: 'Coat-Hanger Brand Logo Reveal Animation',
    toolTag: 'Logo Motion',
    duration: '0:10 Reel',
    role: 'Motion Designer',
    deliverables: ['Animated Logo Sting', 'Light Sweep FX', 'Social Intro'],
    summary:
      'Minimalist cream-backdrop brand ident animating the Dunni Wears coat hanger with a warm light glint before unfolding the threaded script wordmark and WhatsApp contact.',
  },
  rzbszpb29gwoirnop9dw: {
    client: 'Giveday',
    category: 'Video Edits',
    title: 'Launch Alert! Giveday Is Live Camera-Zoom Reel',
    toolTag: 'CapCut + Motion',
    duration: '0:12 Reel',
    role: 'Video Editor & Motion Creator',
    deliverables: ['Launch Announcement Reel', '3D UI Zoom Transition', 'Social Teaser'],
    summary:
      'High-energy launch reel snapping from an angled mobile screen and camera zoom dial directly into a bold held-up broadsheet announcing “LAUNCH Alert! giveday IS LIVE!”',
  },
  kq4wkwqryhhgmmgwwavu: {
    client: 'Spark by Debby',
    category: 'Motion Design',
    title: 'Cupcake Emblem & Bakery Logo Reveal',
    toolTag: 'Logo Motion',
    duration: '0:10 Reel',
    role: 'Motion Designer',
    deliverables: ['Bakery Logo Sting', 'Spark Animation', 'Brand Outro'],
    summary:
      'Clean ivory-backdrop motion ident bringing the Spark by Debby black-and-gold cupcake emblem to life with a warm base glow, golden star pop, and animated hotline reveal.',
  },
};

function findAuditedAssetKey(url: string | null | undefined, map: Record<string, unknown>): string | null {
  if (!url || typeof url !== 'string') return null;
  for (const key of Object.keys(map)) {
    if (url.includes(key)) return key;
  }
  return null;
}

/**
 * Upgrades untouched legacy placeholder captions to accurate audited captions
 * matching the actual Cloudinary asset uploaded to the tile.
 */
export function applyAuditedProjectCaption(item: ProjectItem): ProjectItem {
  if (!LEGACY_PLACEHOLDER_TITLES.has(item.title)) return item;
  const assetKey = findAuditedAssetKey(item.image, AUDITED_PROJECT_BY_ASSET);
  if (!assetKey) return item;
  const meta = AUDITED_PROJECT_BY_ASSET[assetKey];
  return {
    ...item,
    client: meta.client,
    category: meta.category,
    title: meta.title,
    role: meta.role,
    deliverables: [...meta.deliverables],
    summary: meta.summary,
  };
}

export function applyAuditedVideoCaption(item: VideoReelItem): VideoReelItem {
  if (!LEGACY_PLACEHOLDER_TITLES.has(item.title)) return item;
  const assetKey =
    findAuditedAssetKey(item.videoUrl, AUDITED_VIDEO_BY_ASSET) ||
    findAuditedAssetKey(item.posterUrl, AUDITED_VIDEO_BY_ASSET) ||
    findAuditedAssetKey(item.gifUrl, AUDITED_VIDEO_BY_ASSET);
  if (!assetKey) return item;
  const meta = AUDITED_VIDEO_BY_ASSET[assetKey];
  return {
    ...item,
    client: meta.client,
    category: meta.category,
    title: meta.title,
    toolTag: meta.toolTag,
    duration: meta.duration,
    role: meta.role,
    deliverables: [...meta.deliverables],
    summary: meta.summary,
  };
}
