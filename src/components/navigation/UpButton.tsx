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
      {/* Subtle glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-40"
        style={{
          background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
          filter: "blur(8px)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main button - same size as other nav icons */}
      <div
        className="relative h-10 w-10 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
          boxShadow: "0 0 15px rgba(255, 45, 45, 0.4)",
        }}
      >
        {/* Inner shine effect */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
          }}
        />

        {/* Arrow icon */}
        <ArrowUp 
          className="relative z-10 text-white" 
          strokeWidth={2.5} 
          size={20}
        />
      </div>
      
      {/* Label like other nav items */}
      <span className="text-[10px] font-medium mt-1 text-white/70">
        UP
      </span>
    </motion.button>
  );
}
