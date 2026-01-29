import { motion, AnimatePresence } from "framer-motion";
import { Video, CalendarPlus, MapPin, X, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { triggerHaptic } from "@/hooks/use-haptic";
import { Button } from "@/components/ui/button";

interface UpActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpActionMenu({ isOpen, onClose }: UpActionMenuProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOrganizer } = useUserRoles();

  const handleAction = (action: () => void) => {
    triggerHaptic('selection');
    onClose();
    action();
  };

  const actions = [
    {
      icon: Video,
      label: "Postar vídeo do rolê",
      description: "Compartilhe o momento",
      gradient: "from-[#FF6A00] to-[#FF2D2D]",
      onClick: () => {
        if (!user) {
          navigate("/login");
        } else {
          // TODO: Navigate to video upload
          navigate("/eventos");
        }
      },
    },
    {
      icon: CalendarPlus,
      label: isOrganizer ? "Criar evento" : "Quero ser organizador",
      description: isOrganizer ? "Publique seu próximo evento" : "Crie e promova seus eventos",
      gradient: "from-[#FF2D2D] to-[#FF007A]",
      onClick: () => {
        if (isOrganizer) {
          navigate("/organizador/dashboard");
        } else {
          navigate("/organizador/cadastro");
        }
      },
      highlight: !isOrganizer,
    },
    {
      icon: MapPin,
      label: "Check-in",
      description: "Estou aqui agora",
      gradient: "from-[#FF007A] to-[#FF6A00]",
      onClick: () => {
        if (!user) {
          navigate("/login");
        } else {
          // TODO: Navigate to check-in flow
          navigate("/eventos");
        }
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#0a0a0a] rounded-t-3xl overflow-hidden"
            style={{
              boxShadow: "0 -10px 40px rgba(255, 45, 45, 0.2)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span 
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                    }}
                  >
                    UP
                  </span>
                  <Sparkles className="h-5 w-5 text-[#FF007A]" />
                </h2>
                <p className="text-sm text-white/50">O que você quer fazer?</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Actions */}
            <div className="px-4 pb-8 space-y-3">
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleAction(action.onClick)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden"
                  >
                    {/* Icon with gradient background */}
                    <div 
                      className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${action.gradient} shadow-lg`}
                      style={{
                        boxShadow: `0 4px 20px rgba(255, 45, 45, 0.3)`,
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" strokeWidth={2} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-white group-hover:text-white/90 transition-colors">
                        {action.label}
                      </p>
                      <p className="text-sm text-white/40">
                        {action.description}
                      </p>
                    </div>

                    {/* Highlight badge for "become organizer" */}
                    {action.highlight && (
                      <span 
                        className="px-2 py-1 text-xs font-bold rounded-full text-white"
                        style={{
                          background: "linear-gradient(135deg, #FF6A00, #FF007A)",
                        }}
                      >
                        PRO
                      </span>
                    )}

                    {/* Hover glow effect */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(255,106,0,0.05), transparent)`,
                      }}
                    />
                  </motion.button>
                );
              })}
            </div>

            {/* Safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
