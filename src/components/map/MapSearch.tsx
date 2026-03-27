import { useState, useCallback, useRef } from "react";
import { useMap } from "react-leaflet";
import { Search, Loader2, MapPin, X } from "lucide-react";

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function MapSearch() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=br&limit=5`
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

  const handleChange = (value: string) => {
    setQuery(value);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => search(value), 500);
  };

  const selectResult = (r: GeoResult) => {
    map.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 14, { duration: 1.5 });
    setQuery(r.display_name.split(",").slice(0, 2).join(",").trim());
    setShowResults(false);
    setResults([]);
  };

  const clear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-xs pointer-events-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar bairro, cidade..."
          className="w-full h-9 pl-9 pr-8 bg-background/80 backdrop-blur-md border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {!searching && query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-[1001] w-full mt-1 bg-background/95 backdrop-blur-md border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => selectResult(r)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-start gap-2"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
