import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  label: string;
  icon: string;
}

interface CategoryPillsSliderProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryPillsSlider({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryPillsSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative mt-4 group">
      {/* Left scroll button - desktop only */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/80 border border-white/20 text-white hover:bg-white hover:text-black transition-all hidden md:flex",
          !canScrollLeft && "opacity-0 pointer-events-none"
        )}
        onClick={() => scroll("left")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Scrollable container - native scroll, no JS drag */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 md:px-10 scroll-smooth snap-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={cn(
              "px-4 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 snap-start active:scale-[0.95]",
              selectedCategory === cat.id
                ? "bg-white text-black shadow-lg scale-105"
                : "bg-white/10 border border-white/20 hover:bg-white/20 text-white hover:scale-105"
            )}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Right scroll button - desktop only */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/80 border border-white/20 text-white hover:bg-white hover:text-black transition-all hidden md:flex",
          !canScrollRight && "opacity-0 pointer-events-none"
        )}
        onClick={() => scroll("right")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Gradient fades */}
      <div className={cn(
        "absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-black/90 to-transparent pointer-events-none hidden md:block transition-opacity duration-200",
        !canScrollLeft && "opacity-0"
      )} />
      <div className={cn(
        "absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-black/90 to-transparent pointer-events-none hidden md:block transition-opacity duration-200",
        !canScrollRight && "opacity-0"
      )} />
    </div>
  );
}
