import { TileLayer } from "react-leaflet";

/** Shared online basemap for nearby events and event location selection. */
export function BaseMapTiles({ dark = false }: { dark?: boolean }) {
  return (
    <TileLayer
      className={dark ? "map-tiles-dark" : undefined}
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      maxZoom={19}
    />
  );
}
