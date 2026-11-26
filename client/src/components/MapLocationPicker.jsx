import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";

const DEFAULT_CENTER = [17.385, 78.4867];

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:28px;line-height:1;transform:translate(-50%,-90%);filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [0, 0],
});

export async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
  );
  const data = await res.json();
  const addr = data?.address || {};
  const building = addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road || "";
  const area = addr.neighbourhood || addr.suburb || "";
  const city = addr.city || addr.town || addr.village || addr.county || "";
  const state = addr.state || "";
  const parts = [building, area, city, state].filter(Boolean);

  if (parts.length > 0) {
    return Array.from(new Set(parts)).slice(0, 3).join(", ");
  }
  return data?.display_name?.split(",").slice(0, 3).join(", ") || "";
}

export default function MapLocationPicker({
  initialCoords,
  onSelectAddress,
  onClose,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState(initialCoords || DEFAULT_CENTER);
  const [resolving, setResolving] = useState(false);
  const [addressPreview, setAddressPreview] = useState("");

  const updatePin = async (lat, lng, recenter = false) => {
    setCoords([lat, lng]);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (recenter && mapRef.current) {
      mapRef.current.setView([lat, lng], 16, { animate: true });
    }

    setResolving(true);
    try {
      const formatted = await reverseGeocode(lat, lng);
      if (formatted) {
        setAddressPreview(formatted);
        onSelectAddress(formatted, { lat, lng });
      }
    } catch {
      toast.error("Could not fetch address for this pin");
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const start = initialCoords || DEFAULT_CENTER;
    const map = L.map(mapContainerRef.current, {
      center: start,
      zoom: initialCoords ? 16 : 12,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(start, {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);

    map.on("click", (e) => {
      updatePin(e.latlng.lat, e.latlng.lng, false);
    });

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      updatePin(pos.lat, pos.lng, false);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Ensure tiles size properly after mount
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setResolving(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: pos }) => {
        updatePin(pos.latitude, pos.longitude, true);
      },
      () => {
        setResolving(false);
        toast.error("Location permission denied or unavailable");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div
      className="mt-3 rounded-2xl overflow-hidden border"
      style={{ borderColor: "var(--bdr)", background: "var(--sur2)" }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b"
        style={{ borderColor: "var(--bdr)" }}
      >
        <span className="text-xs font-medium" style={{ color: "var(--tx2)" }}>
          Tap anywhere or drag 📍 to pinpoint exact room location
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="btn btn-o"
            style={{ padding: "5px 10px", fontSize: "0.75rem" }}
          >
            📍 My GPS
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-p"
            style={{ padding: "5px 12px", fontSize: "0.75rem" }}
          >
            Done
          </button>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: 260, zIndex: 1 }}
      />

      <div
        className="px-3.5 py-2 text-xs flex items-center justify-between gap-2"
        style={{ color: "var(--tx2)" }}
      >
        <span className="truncate">
          {resolving
            ? "Fetching exact address..."
            : addressPreview
              ? `Pinned: ${addressPreview}`
              : "Click on the map to set exact address"}
        </span>
        <span className="shrink-0 opacity-70">
          {coords[0].toFixed(4)}, {coords[1].toFixed(4)}
        </span>
      </div>
    </div>
  );
}
