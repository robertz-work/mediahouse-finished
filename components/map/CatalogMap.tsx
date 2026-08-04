"use client";

/**
 * Leaflet map showing multiple media markers with popups.
 * Must be loaded with next/dynamic ssr:false.
 */

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type { Media } from "@/lib/db/mediaRepo";

const pinkIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  items: Media[];
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export default function CatalogMap({
  items,
  height = "400px",
  center = [52.0, 19.5],
  zoom = 6,
}: Props) {
  return (
    <div
      style={{ height }}
      className="w-full overflow-hidden rounded-2xl border border-slate-200"
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {items.map((m) => (
          <Marker
            key={m.id}
            position={[m.gps.lat, m.gps.lng]}
            icon={pinkIcon}
          >
            <Popup>
              <div className="min-w-[180px]">
                {m.photos[0] && (
                  <img
                    src={m.photos[0]}
                    alt={m.code}
                    className="mb-2 h-20 w-full rounded object-cover"
                  />
                )}
                <p className="text-sm font-semibold">{m.code}</p>
                <p className="text-xs text-slate-500">{m.address}</p>
                <p className="mt-1 text-xs">
                  {m.size.widthCm}×{m.size.heightCm} cm
                  {m.illuminated && " · Oświetlony"}
                </p>
                {m.pricing.month1 && (
                  <p className="mt-1 text-sm font-bold text-pink-600">
                    od {m.pricing.month1.toLocaleString("pl-PL")} zł/mies.
                  </p>
                )}
                <Link
                  href={`/nosniki/${m.id}`}
                  className="mt-2 inline-block text-xs font-medium text-pink-600 hover:underline"
                >
                  Zobacz szczegóły →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
