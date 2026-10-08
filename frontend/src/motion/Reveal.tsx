import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { fadeInUp, revealViewport, staggerContainer, toReducedMotion } from './animation';
import { useReducedMotion } from './useReducedMotion';

/**
 * Motion components are created once at module scope.
 * Calling motion(tag) during render would return a new component type on every
 * pass, which remounts the subtree and throws the animation away.
 */
const TAGS = {
  div: motion.div,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  section: motion.section,
  p: motion.p,
} as const;

export type RevealTag = keyof typeof TAGS;

type RevealProps = {
  children: ReactNode;
  /** Which variant to play. Defaults to a short fade-and-rise. */
  variants?: Variants;
  /** Stagger children instead of animating the block as one. */
  stagger?: boolean;
  delay?: number;
  className?: string;
  as?: RevealTag;
};

/**
 * Scroll reveal wrapper.
 *
 * One component owns reveal behaviour for the whole page so the trigger point
 * and easing never drift between sections. Under `prefers-reduced-motion` the
 * variant collapses to a plain fade — content still appears, it just does not
 * travel.
 */
export function Reveal({
  children,
  variants = fadeInUp,
  stagger = false,
  delay = 0,
  className,
  as = 'div',
}: RevealProps) {
  const prefersReduced = useReducedMotion();
  const base = stagger ? staggerContainer : variants;
  const resolved = prefersReduced ? toReducedMotion(base) : base;
  const Tag = TAGS[as];

  return (
    <Tag
      className={className}
      variants={resolved}
      initial="hidden"
      whileInView="visible"
      viewport={revealViewport}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </Tag>
  );
}

const ITEM_ACTIVE: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.43, 0.13, 0.23, 0.96] } },
};

/** Child of a `<Reveal stagger>` — rises in sequence with its siblings. */
export function RevealItem({
  children,
  className,
  as = 'div',
  variants = ITEM_ACTIVE,
}: {
  children: ReactNode;
  className?: string;
  as?: RevealTag;
  variants?: Variants;
}) {
  const prefersReduced = useReducedMotion();
  const Tag = TAGS[as];
  const resolved = prefersReduced ? toReducedMotion(variants) : variants;
  return (
    <Tag className={className} variants={resolved}>
      {children}
    </Tag>
  );
}
