import { motion, Variants } from "framer-motion";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  variant?: "fadeUp" | "fadeIn" | "fadeLeft" | "fadeRight" | "scale" | "blur";
  delay?: number;
  duration?: number;
  once?: boolean;
}

const variants: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
};

export function ScrollReveal({
  children,
  className,
  variant = "fadeUp",
  delay = 0,
  duration = 0.6,
  once = true,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal({ triggerOnce: once });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Stagger container for multiple children
interface ScrollRevealContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function ScrollRevealContainer({
  children,
  className,
  staggerDelay = 0.1,
}: ScrollRevealContainerProps) {
  const { ref, isVisible } = useScrollReveal({ triggerOnce: true });

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isVisible ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Item for use inside ScrollRevealContainer
interface ScrollRevealItemProps {
  children: ReactNode;
  className?: string;
  variant?: "fadeUp" | "fadeIn" | "fadeLeft" | "fadeRight" | "scale" | "blur";
}

export function ScrollRevealItem({
  children,
  className,
  variant = "fadeUp",
}: ScrollRevealItemProps) {
  return (
    <motion.div variants={variants[variant]} className={className}>
      {children}
    </motion.div>
  );
}
