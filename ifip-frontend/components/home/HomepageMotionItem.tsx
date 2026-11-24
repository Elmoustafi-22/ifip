"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

const elements = {
  div: motion.div,
  span: motion.span,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  li: motion.li,
};

type Direction = "up" | "left" | "right";

export default function HomepageMotionItem({ as = "div", children, className, id, delay = 0, direction = "up", blur = false }: {
  as?: keyof typeof elements;
  children: ReactNode;
  className?: string;
  id?: string;
  delay?: number;
  direction?: Direction;
  blur?: boolean;
}) {
  const Element = elements[as];
  const x = direction === "left" ? -16 : direction === "right" ? 16 : 0;
  const y = direction === "up" ? 12 : 0;

  return (
    <Element
      className={className}
      id={id}
      data-home-item
      initial={false}
      whileInView={{ x: [x, 0], y: [y, 0], opacity: [0.62, 1], ...(blur ? { filter: ["blur(3px)", "blur(0px)"] } : {}) }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.38, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </Element>
  );
}
