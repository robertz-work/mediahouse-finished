"use client";

/**
 * Leaflet map for picking GPS coordinates by clicking.
 * Must be loaded with next/dynamic({ ssr: false }) because Leaflet
 * requires `window`.
 *
 * Props:
 *   value     — current { lat, lng } or null
 *   onChange  — called with new { lat, lng } on click
 *   height    — CSS height (default "300px")
 */

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
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
  value: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }) => void;
  height?: string;
}

/** Inner component that listens to map clicks. */
function ClickHandler({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({ value, onChange, height = "300px" }: Props) {
  const mapRef = useRef<L.Map | null>(null);

  // Center Poland by default
  const center: [number, number] = value
    ? [value.lat, value.lng]
    : [52.0, 19.5];

  const zoom = value ? 14 : 6;

  useEffect(() => {
    if (mapRef.current && value) {
      mapRef.current.setView([value.lat, value.lng], 14);
    }
  }, [value]);

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-xl border border-slate-300">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {value && (
          <Marker position={[value.lat, value.lng]} icon={defaultIcon} />
        )}
      </MapContainer>
    </div>
  );
}
