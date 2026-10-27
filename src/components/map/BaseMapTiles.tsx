import { TileLayer } from "react-leaflet";

/** Shared online basemap for nearby events and event location selection. */
export function BaseMapTiles() {
  return (
    <TileLayer
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      maxZoom={19}
    />
  );
}
