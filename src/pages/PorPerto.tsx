import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AttributionControl, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@/components/map/nearby.css";
import { format, isToday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, ChevronRight, Compass, Loader2, MapPin, Minus, Navigation, Plus, Radio, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";
import { TikTokDesktopSidebar } from "@/components/layout/TikTokDesktopSidebar";
import { MapSearch } from "@/components/map/MapSearch";
import { MarkerCluster } from "@/components/map/MarkerCluster";
import { BaseMapTiles } from "@/components/map/BaseMapTiles";
import { cn } from "@/lib/utils";

type GeoState = "loading" | "granted" | "denied" | "unavailable";
type Period = "all" | "today" | "week";
interface NearbyEvent {
  id: string; slug: string | null; title: string; cover_image_url: string | null;
  start_at: string; end_at: string | null; venue_name: string | null;
  address_text: string | null; lat: number; lng: number; min_price: number | null;
}
const userIcon = L.divIcon({
  html: '<div class="nearby-user-dot"><span></span></div>', className: "user-marker-icon",
  iconSize: [24, 24], iconAnchor: [12, 12],
});
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Photo marker: shows event cover with stable centered anchor + visible event name
function createPhotoMarker(imageUrl: string | null, color: string, title: string) {
  const safeTitle = escapeHtml(title || "Evento");
  const initials = (title || "EV")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "EV";
  const fallback = `<div class="photo-marker__fallback">${escapeHtml(initials)}</div>`;
  const img = imageUrl
    ? `${fallback}<img src="${escapeHtml(imageUrl)}" alt="${safeTitle}" loading="lazy" onerror="this.remove()" />`
    : fallback;
  return L.divIcon({
    html: `
      <div class="photo-marker" style="--ring:${color}" role="button" aria-label="${safeTitle}" title="${safeTitle}">
        <div class="photo-marker__avatar">${img}</div>
        <div class="photo-marker__label">${safeTitle}</div>
      </div>
    `,
    className: "photo-marker-wrapper",
    iconSize: [136, 82],
    iconAnchor: [68, 28],
    popupAnchor: [0, -36],
  });
}


function MapPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (position) map.flyTo(position, 12, { duration: 1 }); }, [map, position]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
function BoundsTracker({ onChange }: { onChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({ moveend: () => onChange(map.getBounds()) });
  useEffect(() => { onChange(map.getBounds()); }, [map, onChange]);
  return null;
}
function MapTools({ onLocate, locating }: { onLocate: () => void; locating: boolean }) {
  const map = useMap();
  return <>
    <div className="nearby-search"><MapSearch /></div>
    <div className="nearby-map-tools">
      <button aria-label="Usar minha localização" onClick={onLocate} disabled={locating}>
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
      </button>
      <div className="nearby-zoom-tools">
        <button aria-label="Aproximar mapa" onClick={() => map.zoomIn()}><Plus className="h-4 w-4" /></button>
        <button aria-label="Afastar mapa" onClick={() => map.zoomOut()}><Minus className="h-4 w-4" /></button>
      </div>
    </div>
  </>;
}
function distanceKm(origin: [number, number], event: NearbyEvent) {
  const radians = Math.PI / 180;
  const a = Math.sin((event.lat - origin[0]) * radians / 2) ** 2 +
    Math.cos(origin[0] * radians) * Math.cos(event.lat * radians) * Math.sin((event.lng - origin[1]) * radians / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const eventColor = (date: string) => isToday(new Date(date)) ? "#4ade80" : isThisWeek(new Date(date), { weekStartsOn: 1 }) ? "#60a5fa" : "#a1a1aa";
const priceLabel = (price: number | null) => price == null ? "Ver ingressos" : price === 0 ? "Grátis" : `A partir de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(price / 100)}`;

export default function PorPerto() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("loading");
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [live, setLive] = useState(false);
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoState("unavailable"); return; }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setUserPos([coords.latitude, coords.longitude]); setGeoState("granted"); },
      error => setGeoState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);
  useEffect(() => { requestLocation(); }, [requestLocation]);
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ["nearby-events"] }); };
    const channel = supabase.channel("nearby-events-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_types" }, refresh)
      .subscribe(status => setLive(status === "SUBSCRIBED"));
    return () => { void supabase.removeChannel(channel); };
  }, [client]);

  const { data: events = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["nearby-events"],
    queryFn: async (): Promise<NearbyEvent[]> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("events")
        .select("id,slug,title,cover_image_url,start_at,end_at,venue_name,address_text,lat,lng")
        .eq("status", "published").not("lat", "is", null).not("lng", "is", null)
        .or(`start_at.gte.${now},end_at.gte.${now}`).order("start_at", { ascending: true }).limit(500);
      if (error) throw error;
      if (!data?.length) return [];
      const { data: tickets, error: ticketError } = await supabase.from("ticket_types")
        .select("event_id,price_cents").in("event_id", data.map(e => e.id)).eq("status", "active");
      if (ticketError) throw ticketError;
      const prices = new Map<string, number>();
      tickets?.forEach(t => { if (t.price_cents != null) prices.set(t.event_id, Math.min(prices.get(t.event_id) ?? Infinity, t.price_cents)); });
      return data.map(e => ({ ...e, lat: Number(e.lat), lng: Number(e.lng), min_price: prices.get(e.id) ?? null }))
        .filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng) && Math.abs(e.lat) <= 90 && Math.abs(e.lng) <= 180);
    },
    staleTime: 15000, refetchInterval: 30000,
  });
  const filtered = useMemo(() => events.filter(e => period === "all" ||
    (period === "today" ? isToday(new Date(e.start_at)) : isThisWeek(new Date(e.start_at), { weekStartsOn: 1 }))), [events, period]);
  const visible = useMemo(() => filtered.filter(e => !bounds || bounds.contains([e.lat, e.lng]))
    .sort((a, b) => userPos ? distanceKm(userPos, a) - distanceKm(userPos, b) : Date.parse(a.start_at) - Date.parse(b.start_at)), [filtered, bounds, userPos]);
  const markers = useMemo(() => filtered.map(e => ({ id: e.id, position: [e.lat, e.lng] as [number, number],
    icon: createPhotoMarker(e.cover_image_url, eventColor(e.start_at), e.title),
    onClick: () => navigate(`/evento/${e.slug || e.id}`),
  })), [filtered, navigate]);

  return <div className="nearby-page bg-black text-white">
    <Helmet><title>Por perto · UPPLIN</title><meta name="description" content="Descubra eventos perto de você. Explore o mapa e encontre sua próxima experiência." /></Helmet>
    <TikTokDesktopSidebar />
    <main className="nearby-layout">
      <section className="nearby-canvas" aria-label="Mapa de eventos próximos">
        <MapContainer center={[-23.5505, -46.6333]} zoom={11} className="nearby-map h-full w-full" zoomControl={false} attributionControl={false}>
          <BaseMapTiles dark />
          <AttributionControl prefix={false} position="bottomleft" />
          <MapPosition position={userPos} />
          <BoundsTracker onChange={setBounds} />
          <MapTools onLocate={requestLocation} locating={geoState === "loading"} />
          {userPos && <Marker position={userPos} icon={userIcon} interactive={false} />}
          <MarkerCluster markers={markers} />
        </MapContainer>
        <header className="nearby-heading pointer-events-none">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400"><Compass className="h-3.5 w-3.5 text-primary" /> Explore a cidade</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Seu próximo <span className="text-primary">encontro.</span></h1>
        </header>
        <div className="nearby-legend" aria-label="Legenda dos eventos">
          <span><i className="bg-green-400" />Hoje</span><span><i className="bg-blue-400" />Esta semana</span><span><i className="bg-zinc-400" />Próximos</span>
        </div>
        {(geoState === "denied" || geoState === "unavailable") && <div className="nearby-location-notice" role="status">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <p>{geoState === "denied" ? "Permita sua localização para encontrar eventos mais próximos." : "Sua posição não está disponível. Explore o mapa ou busque uma cidade."}</p>
        </div>}
      </section>
      <aside className="nearby-panel" aria-label="Eventos nesta região">
        <div className="nearby-panel-header">
          <div className="mb-3 hidden h-1 w-9 rounded-full bg-zinc-700 mx-auto max-md:block" />
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Descubra ao seu redor</p><h2 className="mt-1 text-lg font-bold tracking-tight">Por perto<span className="text-primary">.</span></h2></div>
            <span className="nearby-count" aria-live="polite">{visible.length} {visible.length === 1 ? "evento" : "eventos"}</span>
          </div>
          <div className="mt-4 flex gap-2" aria-label="Filtrar eventos por data">
            {([['all', 'Todos'], ['today', 'Hoje'], ['week', 'Esta semana']] as const).map(([value, label]) =>
              <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)} className={cn("nearby-filter", period === value && "is-active")}>{label}</button>)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500"><span>Acompanhe a área visível do mapa</span><span className="flex items-center gap-1.5">{live ? <><i className="h-1.5 w-1.5 rounded-full bg-green-400" />Ao vivo</> : <><RefreshCw className="h-3 w-3" />Atualiza automaticamente</>}</span></div>
        </div>
        <div className="nearby-event-list scrollbar-minimal">
          {isLoading ? <div className="nearby-empty" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p>Buscando boas experiências…</p></div> :
            isError ? <div className="nearby-empty" role="alert"><Radio className="h-7 w-7 text-zinc-600" /><h3>Não foi possível carregar os eventos</h3><button onClick={() => void refetch()} className="nearby-filter">Tentar novamente</button></div> :
            !visible.length ? <div className="nearby-empty"><div className="nearby-empty-icon"><Compass className="h-7 w-7" /></div><h3>A próxima descoberta está por aí</h3><p>Nenhum evento {period === "all" ? "nesta área por enquanto" : "neste período e região"}. Mova o mapa, afaste o zoom ou busque outra cidade.</p><Link to="/eventos" className="inline-flex items-center gap-2 text-xs font-semibold text-primary">Explorar eventos <ArrowRight className="h-3.5 w-3.5" /></Link></div> :
            visible.map(event => <Link key={event.id} to={`/evento/${event.slug || event.id}`} className="nearby-event-card group">
              <div className="nearby-event-cover">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-600/30 to-rose-600/20 text-lg font-bold text-orange-200">{event.title.slice(0, 2).toUpperCase()}</div>
                {event.cover_image_url && <img src={event.cover_image_url} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />}
                <span className="nearby-event-day">{format(new Date(event.start_at), "dd")}<small>{format(new Date(event.start_at), "MMM", { locale: ptBR })}</small></span>
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="mb-1 text-[10px] font-medium" style={{ color: eventColor(event.start_at) }}>{isToday(new Date(event.start_at)) ? "HOJE" : format(new Date(event.start_at), "EEE, dd MMM", { locale: ptBR })} · {format(new Date(event.start_at), "HH:mm")}</p>
                <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-primary transition-colors">{event.title}</h3>
                <p className="mt-1.5 flex items-center gap-1 truncate text-[11px] text-zinc-500"><MapPin className="h-3 w-3 shrink-0" />{event.venue_name || event.address_text || "Ver localização"}</p>
                <div className="mt-2 flex items-center justify-between gap-1"><span className={cn("text-xs font-semibold", event.min_price === 0 ? "text-green-400" : "text-zinc-200")}>{priceLabel(event.min_price)}</span>{userPos && <span className="text-[10px] text-zinc-500">{distanceKm(userPos, event).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</span>}</div>
              </div><ChevronRight className="h-4 w-4 shrink-0 self-center text-zinc-600 group-hover:text-primary" />
            </Link>)}
        </div>
        <Link to="/eventos" className="nearby-explore">Explorar todos os eventos<ArrowRight className="h-4 w-4" /></Link>
      </aside>
    </main>
    <BottomNav />
  </div>;
}
