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
    <div className="py-4 md:py-5">

      {/* Draggable categories container */}
      <motion.div
        ref={containerRef}
        className="flex gap-2 md:gap-3 px-4 md:px-0 cursor-grab active:cursor-grabbing overflow-hidden"
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
                className="flex items-center gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-full border border-border bg-background hover:bg-muted hover:border-muted-foreground/30 transition-all duration-200 flex-shrink-0 group shadow-sm hover:shadow-md"
              >
                <div className={cn(
                  "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center bg-gradient-to-br shadow-sm",
                  category.gradient
                )}>
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                </div>
                <span className="text-sm md:text-base font-medium whitespace-nowrap group-hover:text-foreground transition-colors">
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
