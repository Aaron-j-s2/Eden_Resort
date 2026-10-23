import type { ReactNode } from 'react';
import { motion } from 'motion/react';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'figure';
  y?: number;
}

/**
 * Gentle fade-and-rise when content enters the viewport. Runs once. Motion's
 * MotionConfig (reducedMotion="user") disables the movement for visitors who
 * prefer reduced motion.
 */
export function Reveal({ children, delay = 0, className, as = 'div', y = 28 }: RevealProps) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
