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
      className="relative flex items-center justify-center -mt-6"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Outer glow ring - pulsing */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
          filter: "blur(12px)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary glow layer */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
          filter: "blur(8px)",
          opacity: 0.5,
        }}
        animate={{
          scale: [1.05, 1.15, 1.05],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />

      {/* Main button */}
      <div
        className="relative h-14 w-14 rounded-full flex items-center justify-center shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)",
          boxShadow: "0 0 20px rgba(255, 45, 45, 0.5), 0 0 40px rgba(255, 0, 122, 0.3)",
        }}
      >
        {/* Inner shine effect */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
          }}
        />

        {/* Arrow icon */}
        <ArrowUp 
          className="relative z-10 text-white" 
          strokeWidth={3} 
          size={28}
        />

        {/* Subtle pulse on the button itself */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
          }}
          animate={{
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </motion.button>
  );
}
