"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const elements = { div: motion.div, article: motion.article, li: motion.li };

export default function HomepageReveal({ as = "div", children, className, delay = 0 }: {
  as?: keyof typeof elements;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const Element = elements[as];
  const reducedMotion = useReducedMotion();

  return (
    <Element
      className={className}
      data-home-reveal
      initial={false}
      whileInView={reducedMotion ? undefined : { y: [26, 0], opacity: [0.78, 1] }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: 0.58, delay: 0.18 + delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </Element>
  );
}
