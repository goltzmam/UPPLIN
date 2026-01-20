import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Music, 
  PartyPopper, 
  Theater, 
  Trophy, 
  GraduationCap, 
  Utensils,
  Compass
} from "lucide-react";

interface Category {
  name: string;
  icon: React.ElementType;
  gradient: string;
  bgColor: string;
  href: string;
}

const categories: Category[] = [
  { 
    name: "Shows", 
    icon: Music, 
    gradient: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-500/10",
    href: "/eventos?categoria=shows" 
  },
  { 
    name: "Festas", 
    icon: PartyPopper, 
    gradient: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-500/10",
    href: "/eventos?categoria=festas" 
  },
  { 
    name: "Teatro", 
    icon: Theater, 
    gradient: "from-orange-500 to-amber-500",
    bgColor: "bg-orange-500/10",
    href: "/eventos?categoria=teatro" 
  },
  { 
    name: "Esportes", 
    icon: Trophy, 
    gradient: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
    href: "/eventos?categoria=esportes" 
  },
  { 
    name: "Cursos", 
    icon: GraduationCap, 
    gradient: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    href: "/eventos?categoria=cursos" 
  },
  { 
    name: "Gastronomia", 
    icon: Utensils, 
    gradient: "from-red-500 to-orange-500",
    bgColor: "bg-red-500/10",
    href: "/eventos?categoria=gastronomia" 
  },
];

export function CategoriesCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="py-4">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-foreground" />
          <h2 className="font-display text-base font-semibold">Explorar</h2>
        </div>
        <Link 
          to="/eventos" 
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todos
        </Link>
      </div>

      {/* Draggable categories container */}
      <motion.div
        ref={containerRef}
        className="flex gap-2 px-4 cursor-grab active:cursor-grabbing overflow-hidden"
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0.1}
      >
        {categories.map((category, index) => {
          const Icon = category.icon;
          
          return (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link 
                to={category.href}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-background hover:bg-muted transition-all duration-200 flex-shrink-0 group"
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-br",
                  category.gradient
                )}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-medium whitespace-nowrap group-hover:text-foreground transition-colors">
                  {category.name}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
