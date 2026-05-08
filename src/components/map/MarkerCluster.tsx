import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

interface MarkerData {
  id: string;
  position: [number, number];
  icon: L.DivIcon;
  onClick?: () => void;
}

interface MarkerClusterProps {
  markers: MarkerData[];
}

export function MarkerCluster({ markers }: MarkerClusterProps) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size: "small" | "medium" | "large" = "small";
        if (count >= 50) size = "large";
        else if (count >= 10) size = "medium";

        const sizeMap = { small: 36, medium: 44, large: 52 };
        const px = sizeMap[size];

        return L.divIcon({
          html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
          className: "custom-cluster-icon",
          iconSize: L.point(px, px),
        });
      },
    });

    markers.forEach((m) => {
      const marker = L.marker(m.position, { icon: m.icon });
      if (m.onClick) marker.on("click", m.onClick);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [map, markers]);

  return null;
}
