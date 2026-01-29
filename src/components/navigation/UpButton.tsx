import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { triggerHaptic } from "@/hooks/use-haptic";

interface UpButtonProps {
  onClick: () => void;
}

export function UpButton({ onClick }: UpButtonProps) {
  return (
    <motion.button
      onClick={() => {
        triggerHaptic('selection');
        onClick();
      }}
      className="relative flex flex-col items-center justify-center"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Subtle pulse glow effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
          filter: "blur(8px)",
          width: "32px",
          height: "32px",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main button - slightly larger than other icons */}
      <motion.div
        className="relative h-8 w-8 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
          boxShadow: "0 0 12px rgba(255, 45, 45, 0.5)",
        }}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Arrow icon */}
        <ArrowUp 
          className="text-white" 
          strokeWidth={2.5} 
          size={16}
        />
      </motion.div>
      
      {/* Label like other nav items */}
      <span className="text-[10px] font-medium mt-1 text-white/70">
        UP
      </span>
    </motion.button>
  );
}
