import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BaseMapTiles } from "@/components/map/BaseMapTiles";

function createPickerIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 30 16 30s16-18 16-30C32 7.16 24.84 0 16 0z" fill="hsl(var(--primary))" stroke="white" stroke-width="2"/>
    <circle cx="16" cy="16" r="7" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "picker-marker-icon",
    iconSize: [32, 46],
    iconAnchor: [16, 46],
  });
}

const pickerIcon = createPickerIcon();

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

function MapClickHandler({ onPositionChange }: { onPositionChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { duration: 1 });
    }
  }, [position, map]);
  return null;
}

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onLocationChange: (lat: number | null, lng: number | null) => void;
}

export function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const position: [number, number] | null = lat != null && lng != null ? [lat, lng] : null;
  const defaultCenter: [number, number] = position || [-23.5505, -46.6333];

  const handlePositionChange = useCallback(
    (newLat: number, newLng: number) => {
      onLocationChange(
        Math.round(newLat * 1000000) / 1000000,
        Math.round(newLng * 1000000) / 1000000
      );
    },
    [onLocationChange]
  );

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5`
      );
      const data: GeoResult[] = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchAddress(value), 500);
  };

  const selectResult = (result: GeoResult) => {
    handlePositionChange(parseFloat(result.lat), parseFloat(result.lon));
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(","));
    setShowResults(false);
    setResults([]);
  };

  const clearLocation = () => {
    onLocationChange(null, null);
    setSearchQuery("");
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar endereço no mapa..."
            className="pl-9 pr-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute z-[1001] w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectResult(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative h-[250px] rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={defaultCenter}
          zoom={position ? 15 : 11}
          className="h-full w-full"
          zoomControl={false}
        >
          <BaseMapTiles />
          <MapClickHandler onPositionChange={handlePositionChange} />
          <FlyTo position={position} />
          {position && <Marker position={position} icon={pickerIcon} />}
        </MapContainer>

        {!position && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px] pointer-events-none">
            <p className="text-sm text-muted-foreground bg-background/80 px-3 py-1.5 rounded-lg">
              Clique no mapa ou busque um endereço
            </p>
          </div>
        )}
      </div>

      {/* Coordinates display */}
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-2 gap-3 flex-1">
          <div className="space-y-1">
            <Label className="text-xs">Latitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={lat ?? ""}
              onChange={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : null;
                onLocationChange(v, lng);
              }}
              placeholder="-23.5505"
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Longitude</Label>
            <Input
              type="number"
              step="0.000001"
              value={lng ?? ""}
              onChange={(e) => {
                const v = e.target.value ? parseFloat(e.target.value) : null;
                onLocationChange(lat, v);
              }}
              placeholder="-46.6333"
              className="text-xs h-8"
            />
          </div>
        </div>
        {position && (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-4" onClick={clearLocation}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
