import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMap } from "react-leaflet";
import { Search, Loader2, MapPin, X } from "lucide-react";

interface GeoResult { display_name: string; lat: string; lon: string }

export function MapSearch() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [message, setMessage] = useState("");
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 3 || searching) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSearching(true); setMessage(""); setResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&countrycodes=br&limit=5`, { signal: controller.signal });
      if (!res.ok) throw new Error("Search unavailable");
      const data: GeoResult[] = await res.json();
      if (!controller.signal.aborted) {
        setResults(data);
        if (!data.length) setMessage("Nenhum lugar encontrado. Tente outra cidade ou bairro.");
      }
    } catch {
      if (!controller.signal.aborted) setMessage("Não foi possível buscar agora. Tente novamente.");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  };
  const clear = () => {
    request.current?.abort(); setSearching(false); setQuery(""); setResults([]); setMessage("");
  };
  return <div className="relative w-full pointer-events-auto">
    <form onSubmit={search} role="search" aria-label="Buscar localização no mapa" className="relative">
      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <input type="search" value={query} onChange={e => { request.current?.abort(); setSearching(false); setQuery(e.target.value); setResults([]); setMessage(""); }}
        aria-label="Buscar bairro ou cidade" placeholder="Qual é o seu próximo destino?" autoComplete="off"
        className="w-full h-11 pl-10 pr-20 bg-[#111114]/95 backdrop-blur-md border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/40 [&::-webkit-search-cancel-button]:hidden" />
      {query && <button type="button" aria-label="Limpar busca" onClick={clear} className="absolute right-11 top-0 h-11 w-7 flex items-center justify-center text-zinc-500"><X className="h-3.5 w-3.5" /></button>}
      <button type="submit" aria-label="Buscar local" disabled={searching || query.trim().length < 3} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-200 hover:bg-white/5 disabled:opacity-40">
        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
      </button>
    </form>
    {(results.length > 0 || message) && <div className="absolute z-[1001] w-full mt-2 bg-[#141417] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
      {message && <p className="p-4 text-xs text-zinc-400" role="status">{message}</p>}
      {results.map((result, i) => <button key={i} type="button" onClick={() => {
        map.flyTo([Number(result.lat), Number(result.lon)], 13, { duration: 1 });
        setQuery(result.display_name.split(",").slice(0, 2).join(",").trim()); setResults([]);
      }} className="w-full text-left px-4 py-3 text-xs hover:bg-white/5 flex items-start gap-2 text-zinc-300">
        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" /><span className="line-clamp-2">{result.display_name}</span>
      </button>)}
    </div>}
  </div>;
}
