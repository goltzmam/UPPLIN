import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format, isToday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, Navigation, Calendar, Ticket, Gift, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapSearch } from "@/components/map/MapSearch";
import { MarkerCluster } from "@/components/map/MarkerCluster";

// ── Custom marker icons ──────────────────────────────────────────────
function createMarkerIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "custom-marker-icon",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -40],
  });
}

function createUserIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="hsl(var(--primary))" stroke="white" stroke-width="3" opacity="0.9"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: `<div class="user-location-pulse">${svg}</div>`,
    className: "user-marker-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const greenIcon = createMarkerIcon("#22c55e");
const blueIcon = createMarkerIcon("#3b82f6");
const grayIcon = createMarkerIcon("#94a3b8");

// Photo marker: shows event cover with colored ring + pin tail
function createPhotoMarker(imageUrl: string | null, color: string, title: string) {
  const safeTitle = (title || "Evento").replace(/"/g, "&quot;");
  const initials = (title || "EV")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "EV";
  const fallback = `<div class="photo-marker__fallback">${initials}</div>`;
  const img = imageUrl
    ? `<img src="${imageUrl}" alt="${safeTitle}" loading="lazy" onerror="this.parentNode.innerHTML='${fallback.replace(/'/g, "&#39;")}'" />`
    : fallback;
  return L.divIcon({
    html: `
      <div class="photo-marker" style="--ring:${color}" role="button" aria-label="${safeTitle}" title="${safeTitle}">
        <div class="photo-marker__avatar">${img}</div>
        <div class="photo-marker__tail"></div>
      </div>
    `,
    className: "photo-marker-wrapper",
    iconSize: [48, 60],
    iconAnchor: [24, 58],
    popupAnchor: [0, -58],
  });
}

// ── Fly to user position ─────────────────────────────────────────────
function FlyToUser({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 11, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

// ── Track visible map bounds ────────────────────────────────────────
function BoundsTracker({ onChange }: { onChange: (b: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
    zoomend: () => onChange(map.getBounds()),
    load: () => onChange(map.getBounds()),
  });
  useEffect(() => { onChange(map.getBounds()); }, [map, onChange]);
  return null;
}

// ── Types ────────────────────────────────────────────────────────────
interface NearbyEvent {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  start_at: string;
  end_at: string | null;
  venue_name: string | null;
  address_text: string | null;
  lat: number;
  lng: number;
  category: string | null;
  organizer_id: string;
  min_price?: number;
}

type GeoState = "idle" | "loading" | "granted" | "denied" | "unavailable";

export default function PorPerto() {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [selectedEvent, setSelectedEvent] = useState<NearbyEvent | null>(null);
  const navigate = useNavigate();
  const [showMapHint, setShowMapHint] = useState(false);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  // ── Request geolocation ──────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState("unavailable");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setGeoState("granted");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (geoState !== "granted" || !userPos) return;

    setShowMapHint(false);

    const showTimer = window.setTimeout(() => setShowMapHint(true), 1700);
    const hideTimer = window.setTimeout(() => setShowMapHint(false), 4700);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [geoState, userPos]);

  // ── Fetch events with coordinates ────────────────────────────────
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["nearby-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id, slug, title, cover_image_url, start_at, end_at,
          venue_name, address_text, lat, lng, category, organizer_id
        `)
        .eq("status", "published")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .gte("start_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("start_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      const ids = (data || []).map((e) => e.id);
      if (ids.length === 0) return [];

      const { data: tickets } = await supabase
        .from("ticket_types")
        .select("event_id, price_cents")
        .in("event_id", ids)
        .eq("status", "active");

      const priceMap = new Map<string, number>();
      tickets?.forEach((t) => {
        const current = priceMap.get(t.event_id);
        if (current === undefined || (t.price_cents ?? 0) < current) {
          priceMap.set(t.event_id, t.price_cents ?? 0);
        }
      });

      return (data || []).map((e) => ({
        ...e,
        lat: Number(e.lat),
        lng: Number(e.lng),
        min_price: priceMap.get(e.id) ?? 0,
      })) as NearbyEvent[];
    },
    staleTime: 60000,
  });

  // ── Marker icon selection ────────────────────────────────────────
  const getMarkerIcon = useCallback((startAt: string) => {
    const date = new Date(startAt);
    if (isToday(date)) return greenIcon;
    if (isThisWeek(date, { weekStartsOn: 1 })) return blueIcon;
    return grayIcon;
  }, []);

  // ── Default map center ───────────────────────────────────────────
  const defaultCenter: [number, number] = useMemo(() => {
    if (userPos) return userPos;
    if (events.length > 0) return [events[0].lat, events[0].lng];
    return [-23.5505, -46.6333];
  }, [userPos, events]);

  // ── Cluster markers data ─────────────────────────────────────────
  const getMarkerColor = useCallback((startAt: string) => {
    const date = new Date(startAt);
    if (isToday(date)) return "#22c55e";
    if (isThisWeek(date, { weekStartsOn: 1 })) return "#3b82f6";
    return "#94a3b8";
  }, []);

  const clusterMarkers = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        position: [event.lat, event.lng] as [number, number],
        icon: createPhotoMarker(event.cover_image_url, getMarkerColor(event.start_at), event.title),
        onClick: () => navigate(`/evento/${event.slug || event.id}`),
      })),
    [events, getMarkerColor, navigate]
  );

  const formatPrice = (cents: number) =>
    cents === 0 ? "Grátis" : `R$ ${(cents / 100).toFixed(0)}`;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <TikTokDesktopSidebar />

      <main className="flex-1 lg:ml-[72px] relative">
        {/* Map container - full viewport */}
        <div className="fixed inset-0 lg:left-[72px] lg:right-[380px] z-0">
          <MapContainer
            center={defaultCenter}
            zoom={userPos ? 11 : 10}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            />

            <FlyToUser position={userPos} />
            <MapSearch />

            {/* User position */}
            {userPos && (
              <Marker position={userPos} icon={createUserIcon()}>
                <Popup className="custom-popup">
                  <span className="text-sm font-medium">Você está aqui</span>
                </Popup>
              </Marker>
            )}

            {/* Clustered event markers */}
            <MarkerCluster markers={clusterMarkers} />
            <BoundsTracker onChange={setBounds} />
          </MapContainer>
        </div>

        {/* Desktop side panel - events visible in current map area */}
        <aside className="hidden lg:flex flex-col fixed top-0 right-0 bottom-0 w-[380px] z-[1001] bg-background/95 backdrop-blur-md border-l border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Eventos nesta região
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(() => {
                  const visible = bounds
                    ? events.filter((e) => bounds.contains([e.lat, e.lng]))
                    : events;
                  return `${visible.length} ${visible.length === 1 ? "evento encontrado" : "eventos encontrados"}`;
                })()}
              </p>
            </div>
          </div>
          <div
            className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2 scrollbar-minimal scroll-smooth"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 24px), transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 24px), transparent 100%)",
            }}
          >
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const visible = bounds
                ? events.filter((e) => bounds.contains([e.lat, e.lng]))
                : events;
              if (visible.length === 0) {
                return (
                  <div className="text-center py-12 px-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhum evento nesta região do mapa.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Arraste ou diminua o zoom para ver mais.
                    </p>
                  </div>
                );
              }
              return visible.map((ev) => (
                <Link
                  key={ev.id}
                  to={`/evento/${ev.slug || ev.id}`}
                  className="block p-2.5 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-card/80 transition-colors"
                >
                  <div className="flex gap-3 items-center">
                    <div
                      className="w-14 h-14 rounded-full overflow-hidden shrink-0 ring-[3px] shadow-md"
                      style={{ boxShadow: `0 0 0 3px ${getMarkerColor(ev.start_at)}` }}
                    >
                      {ev.cover_image_url ? (
                        <img
                          src={ev.cover_image_url}
                          alt={ev.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const t = e.currentTarget;
                            t.style.display = "none";
                            const sib = t.nextElementSibling as HTMLElement | null;
                            if (sib) sib.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full items-center justify-center text-[11px] font-bold text-white"
                        style={{
                          display: ev.cover_image_url ? "none" : "flex",
                          background: "linear-gradient(135deg, #FF6A00, #FF2D2D, #FF007A)",
                        }}
                      >
                        {(ev.title || "EV").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                        {ev.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {format(new Date(ev.start_at), "d MMM · HH:mm", { locale: ptBR })}
                      </p>
                      {ev.venue_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {ev.venue_name}
                        </p>
                      )}
                      <p className="text-xs font-bold text-primary mt-1">
                        {(ev.min_price ?? 0) === 0 ? "Grátis" : formatPrice(ev.min_price ?? 0)}
                      </p>
                    </div>
                  </div>
                </Link>
              ));
            })()}
          </div>
        </aside>

        {/* Top overlay - legend + search + recenter */}
        <div className="fixed top-4 left-4 right-4 lg:left-[88px] z-[1000] flex items-start justify-between gap-2 pointer-events-none">
          {/* Legend */}
          <div className="bg-background/80 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg pointer-events-auto border border-border">
            <h2 className="text-sm font-bold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Por Perto
            </h2>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Hoje
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Esta semana
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                Próximos
              </span>
            </div>
          </div>

          {/* Recenter button */}
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-lg pointer-events-auto"
            onClick={requestLocation}
            disabled={geoState === "loading"}
          >
            {geoState === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Geo denied state */}
        {geoState === "denied" && (
          <div className="fixed bottom-28 left-4 right-4 lg:left-[88px] z-[1000] max-w-sm mx-auto">
            <div className="bg-destructive/10 border border-destructive/30 backdrop-blur-md rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Localização negada</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Permita acesso à localização nas configurações do navegador para ver eventos próximos.
                </p>
              </div>
            </div>
          </div>
        )}

        {showMapHint && !selectedEvent && (
          <div className="fixed bottom-44 left-4 right-4 lg:left-[88px] z-[1000] max-w-sm mx-auto animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="bg-background/88 backdrop-blur-md rounded-xl px-4 py-3 text-center border border-border shadow-lg">
              <p className="text-sm font-medium text-foreground">Explore o mapa e descubra eventos pela região</p>
            </div>
          </div>
        )}

        {!selectedEvent && (
          <div className="fixed bottom-28 left-4 right-4 lg:left-[88px] z-[1000] max-w-sm mx-auto">
            <Link
              to="/eventos"
              className="block rounded-xl border border-border bg-background/80 px-4 py-4 text-center text-sm font-medium text-primary shadow-lg backdrop-blur-md transition-colors hover:bg-background/90"
            >
              Explorar todos os eventos →
            </Link>
          </div>
        )}

        {/* Selected event card */}
        {selectedEvent && (
          <div className="fixed bottom-24 left-4 right-4 lg:left-[88px] z-[1000] max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Close */}
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>

              <div className="flex gap-3 p-3">
                {selectedEvent.cover_image_url ? (
                  <img
                    src={selectedEvent.cover_image_url}
                    alt={selectedEvent.title}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1">
                    {selectedEvent.title}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {format(new Date(selectedEvent.start_at), "d MMM · HH:mm", { locale: ptBR })}
                  </p>
                  {selectedEvent.venue_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {selectedEvent.venue_name}
                    </p>
                  )}
                </div>
              </div>

              <Link
                to={`/evento/${selectedEvent.slug || selectedEvent.id}`}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors",
                  (selectedEvent.min_price ?? 0) === 0
                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                    : "text-white hover:opacity-90"
                )}
                style={
                  (selectedEvent.min_price ?? 0) > 0
                    ? { background: "linear-gradient(135deg, #FF6A00 0%, #FF2D2D 50%, #FF007A 100%)" }
                    : undefined
                }
              >
                {(selectedEvent.min_price ?? 0) === 0 ? (
                  <Gift className="h-4 w-4" />
                ) : (
                  <Ticket className="h-4 w-4" />
                )}
                {(selectedEvent.min_price ?? 0) === 0
                  ? "Participar — Grátis"
                  : `Comprar — ${formatPrice(selectedEvent.min_price ?? 0)}`}
              </Link>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
