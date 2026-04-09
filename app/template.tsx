"use client";

import { motion } from "framer-motion";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    y: 4,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-full"
    >
      {children}
    </motion.div>
  );
}
