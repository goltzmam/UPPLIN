import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TileLayer } from "react-leaflet";

/** Public, origin-restricted map keys. Native apps require their own key. */
export function BaseMapTiles({ dark = false }: { dark?: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  const key = (Capacitor.isNativePlatform()
    ? import.meta.env.VITE_MAPTILER_NATIVE_KEY
    : import.meta.env.VITE_MAPTILER_KEY) || "";
  const useMapTiler = Boolean(key) && !unavailable;
  const style = dark ? "streets-v2-dark" : "streets-v2";

  return useMapTiler ? (
    <TileLayer
      key={style}
      className="map-tiles-maptiler"
      url={`https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`}
      attribution='<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>'
      tileSize={512}
      zoomOffset={-1}
      minZoom={1}
      maxZoom={22}
      eventHandlers={{ tileerror: () => setUnavailable(true) }}
    />
  ) : (
    <TileLayer
      key="openstreetmap"
      className={dark ? "map-tiles-dark" : undefined}
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      maxZoom={19}
    />
  );
}
