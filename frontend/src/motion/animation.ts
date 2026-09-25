/**
 * Motion primitives.
 *
 * Adapted from the project's Motion Framework Kit
 * (animation/motion-framework-kit/motion-src/utils/animation.ts) — same easing
 * curves and variant names, retuned for this product:
 *   - hover lift reduced from -5px to -3px (cards sit in dense grids here)
 *   - glow colour swapped from the kit's cyan to solar amber
 *   - every distance kept under 24px so nothing travels far enough to feel busy
 */
import type { Variants } from 'framer-motion';

export const easings = {
  smooth: [0.43, 0.13, 0.23, 0.96] as const,
  gentle: { type: 'spring', stiffness: 100, damping: 20 } as const,
  spring: { type: 'spring', stiffness: 400, damping: 30 } as const,
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: easings.smooth },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easings.smooth },
  },
};

/** Card hover: a small lift plus the warm shadow from the token set. */
export const cardHover = {
  y: -3,
  boxShadow: '0 12px 32px rgba(23, 20, 15, 0.12)',
  transition: { type: 'spring', stiffness: 300, damping: 22 },
} as const;

/** Primary CTA hover: the solar glow, matching --shadow-glow. */
export const ctaHover = {
  y: -1,
  boxShadow: '0 8px 32px rgba(229, 146, 15, 0.32)',
  transition: { duration: 0.2 },
} as const;

/** Strips travel and scale out of a variant, keeping only the fade. */
export const toReducedMotion = (variant: Variants): Variants => ({
  hidden: { ...(variant.hidden as object), x: 0, y: 0, scale: 1 },
  visible: {
    ...(variant.visible as object),
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: 0.01 },
  },
});

/** Shared viewport config so every section reveals at the same trigger point. */
export const revealViewport = { once: true, amount: 0.2, margin: '0px 0px -80px 0px' } as const;
