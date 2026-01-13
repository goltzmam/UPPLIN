import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useEmblaCarousel from "embla-carousel-react";

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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});

  // Combine cover image with media
  const allMedia: MediaItem[] = [
    ...(coverImage ? [{ id: "cover", url: coverImage, type: "image" as const, sort_order: -1 }] : []),
    ...media.sort((a, b) => a.sort_order - b.sort_order)
  ];

  const scrollPrev = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollPrev();
      setCurrentIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
    }
  }, [emblaApi, allMedia.length]);

  const scrollNext = useCallback(() => {
    if (emblaApi) {
      emblaApi.scrollNext();
      setCurrentIndex((prev) => (prev + 1) % allMedia.length);
    }
  }, [emblaApi, allMedia.length]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) {
      emblaApi.scrollTo(index);
      setCurrentIndex(index);
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
    <div className="relative w-full h-full group">
      {/* Carousel */}
      <div className="overflow-hidden w-full h-full" ref={emblaRef}>
        <div className="flex h-full">
          {allMedia.map((item, index) => (
            <div key={item.id} className="flex-[0_0_100%] min-w-0 h-full relative">
              {item.type === "video" ? (
                <div className="relative w-full h-full">
                  <video
                    id={`video-${item.id}`}
                    src={item.url}
                    className="w-full h-full object-cover"
                    loop
                    muted
                    playsInline
                    onEnded={() => setIsPlaying((prev) => ({ ...prev, [item.id]: false }))}
                  />
                  <button
                    onClick={() => toggleVideoPlay(item.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                  >
                    <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                      {isPlaying[item.id] ? (
                        <Pause className="h-8 w-8 text-secondary" />
                      ) : (
                        <Play className="h-8 w-8 text-secondary ml-1" />
                      )}
                    </div>
                  </button>
                </div>
              ) : (
                <img 
                  src={item.url} 
                  alt={`${title} - ${index + 1}`} 
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={scrollPrev}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={scrollNext}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {allMedia.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={cn(
              "h-2 rounded-full transition-all",
              currentIndex === index 
                ? "w-6 bg-white" 
                : "w-2 bg-white/50 hover:bg-white/70"
            )}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
        {currentIndex + 1} / {allMedia.length}
      </div>
    </div>
  );
}
