import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { MapPin, Navigation, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventGridCard } from "./EventGridCard";

interface NearbyEventsProps {
  limit?: number;
}

export function NearbyEvents({ limit = 4 }: NearbyEventsProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Request geolocation
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocalização não suportada pelo navegador");
      return;
    }

    setIsRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsRequestingLocation(false);
      },
      (error) => {
        setLocationError("Não foi possível obter sua localização");
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Auto-request on mount if permission was previously granted
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          requestLocation();
        }
      });
    }
  }, []);

  // Fetch nearby events
  const { data: nearbyEvents, isLoading } = useQuery({
    queryKey: ["nearby-events", location?.lat, location?.lng],
    queryFn: async () => {
      if (!location) return [];

      // Get events with lat/lng and calculate distance
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          organizer:organizer_id(id, display_name, logo_url, slug),
          ticket_types(price_cents)
        `)
        .eq("status", "published")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(20);

      if (error) throw error;

      // Calculate distance and sort
      const eventsWithDistance = (data || []).map((event) => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          event.lat!,
          event.lng!
        );
        return { ...event, distance };
      });

      // Sort by distance and take limit
      return eventsWithDistance
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    },
    enabled: !!location,
  });

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km.toFixed(1)}km`;
  };

  // Transform events for cards
  const feedItems = (nearbyEvents || []).map((event: any) => {
    const minPrice = event.ticket_types?.length > 0
      ? Math.min(...event.ticket_types.map((t: any) => t.price_cents))
      : 0;

    return {
      id: event.id,
      title: event.title,
      coverImageUrl: event.cover_image_url,
      startAt: event.start_at,
      venueName: event.venue_name,
      organizerName: event.organizer?.display_name,
      organizerAvatar: event.organizer?.logo_url,
      organizerSlug: event.organizer?.slug,
      minPrice,
      distance: event.distance,
    };
  });

  // Don't show section if no location and no events
  if (!location && !locationError) {
    return (
      <section className="py-8 border-b border-border/30">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Eventos Próximos</h2>
                <p className="text-sm text-muted-foreground">Descubra o que está rolando perto de você</p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-muted/50 border border-border/50"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
              <Navigation className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ative sua localização</h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs mb-4">
              Permita acesso à sua localização para descobrir eventos incríveis perto de você
            </p>
            <Button 
              onClick={requestLocation}
              disabled={isRequestingLocation}
              className="rounded-full"
            >
              {isRequestingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Obtendo localização...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Ativar Localização
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  if (locationError) {
    return null; // Hide section on error
  }

  if (isLoading) {
    return (
      <section className="py-8 border-b border-border/30">
        <div className="container">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Eventos Próximos</h2>
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (feedItems.length === 0) {
    return null; // Hide section if no nearby events
  }

  return (
    <section className="py-8 border-b border-border/30">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Eventos Próximos</h2>
              <p className="text-sm text-muted-foreground">Perto de você agora</p>
            </div>
          </div>
          <Link 
            to="/eventos" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors group"
          >
            Ver todos
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {feedItems.map((item, index) => (
            <div key={item.id} className="relative">
              <EventGridCard
                id={item.id}
                title={item.title}
                coverImageUrl={item.coverImageUrl}
                startAt={item.startAt}
                venueName={item.venueName}
                organizerName={item.organizerName}
                organizerAvatar={item.organizerAvatar}
                organizerSlug={item.organizerSlug}
                minPrice={item.minPrice}
                index={index}
              />
              {/* Distance badge */}
              <div className="absolute bottom-20 left-3 z-10">
                <div className="px-2 py-1 rounded-full bg-blue-500/90 backdrop-blur-sm text-white text-[10px] font-medium flex items-center gap-1">
                  <Navigation className="h-2.5 w-2.5" />
                  {formatDistance(item.distance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
