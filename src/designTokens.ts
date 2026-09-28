/**
 * Farm Trust — Mobile-First Design Tokens
 * Single source of truth for colors, typography, spacing, radii, and UI presets.
 */

// ─── Colors ───
export const colors = {
  // Brand
  forest: '#1B3D27',      // Primary brand green
  mint: '#E6F2EA',        // Soft mint tint / active surface
  amber: '#F5B800',       // Mic action & single highlight accent
  cream: '#FBF8F1',       // App body background

  // Neutrals
  text: '#1A1A1A',        // High-contrast primary text (14:1 on cream)
  muted: '#5B5B5B',       // Muted secondary text (5:1 on cream, WCAG AA)
  cardBg: '#FFFFFF',      // Card background
  border: '#E2DDCF',      // Warm neutral border
  borderLight: '#ECE7DD', // Subtle divider border

  // Semantics
  danger: '#B3261E',      // Alert / rejection / delete
  success: '#1E7B3F',     // Completed / verified / order placed
  warningBg: '#FFF4D6',   // Warning / advisory card background
  warningText: '#5C4300', // Warning text (6.8:1 contrast on warningBg)
} as const;

// ─── Typography Scale ───
// Type scale: 14, 16, 18, 22, 28
export const typography = {
  h1: 'text-[28px] font-black leading-tight tracking-tight',
  h2: 'text-[22px] font-black leading-snug tracking-tight',
  h3: 'text-[18px] font-bold leading-normal',
  body: 'text-[16px] font-normal leading-relaxed',
  bodyBold: 'text-[16px] font-bold leading-relaxed',
  caption: 'text-[14px] font-medium leading-normal',
  captionBold: 'text-[14px] font-bold leading-normal',
  price: 'text-[22px] font-black tracking-tight',
  priceLarge: 'text-[28px] font-black tracking-tight',
} as const;

// ─── Spacing & Layout ───
// 4pt grid with 16px mobile gutters
export const layout = {
  gutter: 'px-4',                // 16px gutter on mobile
  maxWidth: 'max-w-md mx-auto',  // Centered mobile column on tablet/desktop
  desktopContainer: 'max-w-2xl mx-auto',
  appBarHeight: 'h-14',          // 56px app bar
  bottomNavHeight: 'h-16',       // 64px bottom nav
  bottomPadding: 'pb-28',        // Generous bottom clearance for fixed nav
} as const;

// ─── Radii ───
// 12px, 16px, pill
export const radii = {
  sm: 'rounded-xl',       // 12px
  lg: 'rounded-2xl',      // 16px
  pill: 'rounded-full',   // 9999px
  modalTop: 'rounded-t-3xl',
} as const;

// ─── Soft Shadows ───
export const shadows = {
  soft: 'shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
  elevated: 'shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
  nav: 'shadow-[0_-2px_12px_rgba(0,0,0,0.06)]',
  mic: 'shadow-[0_4px_20px_rgba(245,184,0,0.45)]',
} as const;

// ─── Button Styles ───
// Primary: forest/white 56px min
// Secondary: outline 56px min
// Mic: amber 56px / 64px min
export const button = {
  primary:
    'w-full min-h-[56px] px-5 py-3.5 bg-[#1B3D27] text-white hover:bg-[#14321D] active:scale-[0.98] font-bold text-[16px] rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  secondary:
    'w-full min-h-[56px] px-5 py-3.5 bg-transparent text-[#1B3D27] border-2 border-[#1B3D27] hover:bg-[#E6F2EA] active:scale-[0.98] font-bold text-[16px] rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  mic:
    'min-h-[56px] px-6 py-3.5 bg-[#F5B800] text-[#1A1A1A] hover:bg-[#E5AC00] active:scale-[0.96] font-black text-[16px] rounded-full flex items-center justify-center gap-2.5 transition-all shadow-[0_4px_16px_rgba(245,184,0,0.4)] cursor-pointer',
  dangerText:
    'min-h-[48px] px-4 py-2 text-[#B3261E] hover:bg-red-50 font-bold text-[14px] rounded-lg transition-colors cursor-pointer',
  chip:
    'min-h-[44px] px-4 py-2 rounded-full font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer active:scale-95',
} as const;

// ─── Input Styles ───
export const input = {
  field:
    'w-full min-h-[56px] px-4 py-3 text-[16px] text-[#1A1A1A] placeholder:text-[#5B5B5B] bg-white border border-[#E2DDCF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3D27] transition-all',
} as const;
