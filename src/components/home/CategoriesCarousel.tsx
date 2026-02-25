import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Music, 
  PartyPopper, 
  Theater, 
  Trophy, 
  GraduationCap, 
  Utensils
} from "lucide-react";

interface Category {
  name: string;
  icon: React.ElementType;
  gradient: string;
  href: string;
}

const categories: Category[] = [
  { name: "Shows", icon: Music, gradient: "from-pink-500 to-rose-500", href: "/eventos?categoria=shows" },
  { name: "Festas", icon: PartyPopper, gradient: "from-purple-500 to-violet-500", href: "/eventos?categoria=festas" },
  { name: "Teatro", icon: Theater, gradient: "from-orange-500 to-amber-500", href: "/eventos?categoria=teatro" },
  { name: "Esportes", icon: Trophy, gradient: "from-green-500 to-emerald-500", href: "/eventos?categoria=esportes" },
  { name: "Cursos", icon: GraduationCap, gradient: "from-blue-500 to-cyan-500", href: "/eventos?categoria=cursos" },
  { name: "Gastronomia", icon: Utensils, gradient: "from-red-500 to-orange-500", href: "/eventos?categoria=gastronomia" },
];

export function CategoriesCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  return (
    <div className="py-4 md:py-5 relative">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 md:gap-3 px-4 md:px-0 overflow-x-auto scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {categories.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.3 }}
              className="snap-start"
            >
              <Link 
                to={category.href}
                className="flex items-center gap-2.5 px-4 md:px-5 py-2.5 md:py-3 rounded-full border border-border bg-background hover:bg-muted hover:border-muted-foreground/30 transition-all duration-200 flex-shrink-0 group shadow-sm hover:shadow-md active:scale-[0.97]"
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
      </div>

      {/* Left fade */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent pointer-events-none transition-opacity duration-200 md:hidden",
        canScrollLeft ? "opacity-100" : "opacity-0"
      )} />
      {/* Right fade */}
      <div className={cn(
        "absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent pointer-events-none transition-opacity duration-200 md:hidden",
        canScrollRight ? "opacity-100" : "opacity-0"
      )} />
    </div>
  );
}
