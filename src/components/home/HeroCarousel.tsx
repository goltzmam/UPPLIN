import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  date: string;
  location: string;
  ctaText: string;
  ctaLink: string;
}

const heroSlides: HeroSlide[] = [
  {
    id: "1",
    title: "Festival de Verão 2026",
    subtitle: "O maior festival de música do Brasil",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1920&q=80",
    date: "15-17 Fev 2026",
    location: "Rio de Janeiro, RJ",
    ctaText: "Garantir Ingresso",
    ctaLink: "/eventos",
  },
  {
    id: "2",
    title: "Tech Summit Brasil",
    subtitle: "Conectando inovadores e visionários",
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1920&q=80",
    date: "08 Mar 2026",
    location: "São Paulo, SP",
    ctaText: "Inscreva-se",
    ctaLink: "/eventos",
  },
  {
    id: "3",
    title: "Carnaval Experience",
    subtitle: "Viva a magia do carnaval brasileiro",
    image: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=1920&q=80",
    date: "28 Fev - 05 Mar",
    location: "Salvador, BA",
    ctaText: "Ver Programação",
    ctaLink: "/eventos",
  },
];

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  const goTo = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prev = () => goTo((activeIndex - 1 + heroSlides.length) % heroSlides.length);
  const next = () => goTo((activeIndex + 1) % heroSlides.length);

  return (
    <section className="relative h-[70vh] min-h-[500px] max-h-[700px] overflow-hidden">
      {/* Slides */}
      {heroSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-all duration-700 ease-out",
            index === activeIndex
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105"
          )}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="container relative h-full flex items-center">
            <div
              className={cn(
                "max-w-xl space-y-6 transition-all duration-700 delay-200",
                index === activeIndex
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              )}
            >
              <div className="flex items-center gap-4 text-secondary-foreground/80">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {slide.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {slide.location}
                </span>
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-secondary-foreground leading-tight">
                {slide.title}
              </h1>
              
              <p className="text-lg md:text-xl text-secondary-foreground/80">
                {slide.subtitle}
              </p>
              
              <Button size="xl" variant="hero" asChild className="group">
                <Link to={slide.ctaLink}>
                  {slide.ctaText}
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-background/40 transition-colors z-10"
        aria-label="Slide anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-background/40 transition-colors z-10"
        aria-label="Próximo slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === activeIndex
                ? "w-8 bg-primary"
                : "w-2 bg-white/50 hover:bg-white/80"
            )}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
