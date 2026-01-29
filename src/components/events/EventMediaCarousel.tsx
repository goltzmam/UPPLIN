import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  sort_order: number;
}

interface EventMediaCarouselProps {
  media: MediaItem[];
  coverImage?: string | null;
  title: string;
}

export function EventMediaCarousel({ media, coverImage, title }: EventMediaCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true,
    duration: 25, // Smoother transition
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Combine cover image with media
  const allMedia: MediaItem[] = [
    ...(coverImage ? [{ id: "cover", url: coverImage, type: "image" as const, sort_order: -1 }] : []),
    ...media.sort((a, b) => a.sort_order - b.sort_order)
  ];

  // Listen to embla select events for smooth index updates
  useEffect(() => {
    if (!emblaApi) return;
    
    const onSelect = () => {
      setCurrentIndex(emblaApi.selectedScrollSnap());
      setIsTransitioning(false);
    };
    
    const onScroll = () => {
      setIsTransitioning(true);
    };

    emblaApi.on("select", onSelect);
    emblaApi.on("scroll", onScroll);
    
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("scroll", onScroll);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      setIsTransitioning(true);
      emblaApi.scrollPrev();
    }
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      setIsTransitioning(true);
      emblaApi.scrollNext();
    }
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) {
      setIsTransitioning(true);
      emblaApi.scrollTo(index);
    }
  }, [emblaApi]);

  const toggleVideoPlay = (id: string) => {
    const video = document.getElementById(`video-${id}`) as HTMLVideoElement;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying((prev) => ({ ...prev, [id]: true }));
      } else {
        video.pause();
        setIsPlaying((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  if (allMedia.length === 0) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
        <span className="text-muted-foreground">Sem imagem</span>
      </div>
    );
  }

  if (allMedia.length === 1) {
    const item = allMedia[0];
    return (
      <div className="w-full h-full">
        {item.type === "video" ? (
          <video
            src={item.url}
            className="w-full h-full object-cover"
            controls
            poster={coverImage || undefined}
          />
        ) : (
          <img src={item.url} alt={title} className="w-full h-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full group overflow-hidden">
      {/* Carousel */}
      <div className="overflow-hidden w-full h-full" ref={emblaRef}>
        <div className="flex h-full">
          {allMedia.map((item, index) => (
            <div 
              key={item.id} 
              className={cn(
                "flex-[0_0_100%] min-w-0 h-full relative transition-all duration-500 ease-out",
                index === currentIndex ? "opacity-100 scale-100" : "opacity-60 scale-95"
              )}
            >
              {item.type === "video" ? (
                <div className="relative w-full h-full">
                  <video
                    id={`video-${item.id}`}
                    src={item.url}
                    className="w-full h-full object-cover transition-transform duration-500"
                    loop
                    muted
                    playsInline
                    onEnded={() => setIsPlaying((prev) => ({ ...prev, [item.id]: false }))}
                  />
                  <motion.button
                    onClick={() => toggleVideoPlay(item.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div 
                      className="h-16 w-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <AnimatePresence mode="wait">
                        {isPlaying[item.id] ? (
                          <motion.div
                            key="pause"
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Pause className="h-8 w-8 text-secondary" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="play"
                            initial={{ scale: 0, rotate: 90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: -90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Play className="h-8 w-8 text-secondary ml-1" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.button>
                </div>
              ) : (
                <motion.img 
                  src={item.url} 
                  alt={`${title} - ${index + 1}`} 
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows with smooth hover */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          onClick={scrollNext}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Animated Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {allMedia.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-colors duration-300",
              currentIndex === index 
                ? "bg-white" 
                : "bg-white/50 hover:bg-white/70"
            )}
            animate={{
              width: currentIndex === index ? 24 : 8,
              scale: currentIndex === index ? 1 : 0.9,
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25 
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </div>

      {/* Counter with fade animation */}
      <motion.div 
        className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm font-medium border border-white/10 z-10"
        key={currentIndex}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {currentIndex + 1} / {allMedia.length}
      </motion.div>
    </div>
  );
}
