"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

const elements = { div: motion.div, article: motion.article, li: motion.li };

export default function HomepageReveal({ as = "div", children, className, delay = 0, variant = "content", direction = "up" }: {
  as?: keyof typeof elements;
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "content" | "media";
  direction?: "up" | "left" | "right";
}) {
  const Element = elements[as];
  const offset = direction === "left" ? -28 : direction === "right" ? 28 : 0;
  return (
    <Element
      className={className}
      data-home-reveal
      initial={false}
      whileInView={variant === "media" ? { scale: [1.045, 1], opacity: [0.72, 1] } : { x: [offset, 0], y: [direction === "up" ? 20 : 0, 0], opacity: [0.72, 1] }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: variant === "media" ? 0.72 : 0.5, delay: 0.08 + delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </Element>
  );
}
