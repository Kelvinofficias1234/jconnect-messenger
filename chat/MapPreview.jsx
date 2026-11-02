import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:28px;height:34px;">
    <div style="position:absolute;top:0;left:2px;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#7c3aed,#4f46e5);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>
    <div style="position:absolute;top:7px;left:9px;width:10px;height:10px;border-radius:50%;background:#fff;"></div>
  </div>`,
  iconSize: [28, 34],
  iconAnchor: [14, 32],
});

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom() || 15);
  }, [lat, lng]);
  return null;
}

export default function MapPreview({ lat, lng }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ width: '100%', height: '100%', background: '#0d0f1e' }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pinIcon} />
      <Recenter lat={lat} lng={lng} />
    </MapContainer>
  );
}