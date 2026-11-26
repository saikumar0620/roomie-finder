import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import MapLocationPicker, { reverseGeocode } from "./MapLocationPicker";

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = "e.g. Bangalore",
  showCurrentLocation = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [pinnedCoords, setPinnedCoords] = useState(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=in`
      );
      const data = await res.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Location API error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setShowDropdown(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 500);
  };

  const handleSelect = (suggestion) => {
    const { address } = suggestion;
    let displayName = suggestion.display_name.split(",")[0];

    if (address) {
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.suburb ||
        address.county;
      const state = address.state;
      if (city && state) {
        displayName = `${city}, ${state}`;
      } else {
        displayName = suggestion.display_name.split(",").slice(0, 2).join(",");
      }
    }

    if (suggestion.lat && suggestion.lon) {
      setPinnedCoords([Number(suggestion.lat), Number(suggestion.lon)]);
    }

    onChange(displayName);
    setShowDropdown(false);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          setPinnedCoords([coords.latitude, coords.longitude]);
          const formatted = await reverseGeocode(coords.latitude, coords.longitude);
          if (!formatted) {
            toast.error("Could not determine address from your location");
            return;
          }
          onChange(formatted);
          setShowDropdown(false);
          toast.success("Location detected!");
        } catch {
          toast.error("Failed to fetch address for your location");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please allow location access.");
        } else {
          toast.error("Unable to get your current location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <input
        type="text"
        className="inp"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        autoComplete="off"
      />

      {showCurrentLocation && (
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="btn btn-o flex-1 sm:flex-initial justify-center whitespace-nowrap"
            style={{ padding: "8px 12px", fontSize: "0.8125rem" }}
          >
            {locating ? "📍 Detecting..." : "📍 Use Current Location"}
          </button>
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="btn btn-o flex-1 sm:flex-initial justify-center whitespace-nowrap"
            style={{
              padding: "8px 12px",
              fontSize: "0.8125rem",
              borderColor: showMap ? "var(--p)" : undefined,
              color: showMap ? "var(--p)" : undefined,
            }}
          >
            {showMap ? "Hide Map" : "🗺️ Pin Exact Location on Map"}
          </button>
        </div>
      )}

      {showCurrentLocation && showMap && (
        <MapLocationPicker
          initialCoords={pinnedCoords}
          onSelectAddress={(addr, { lat, lng }) => {
            setPinnedCoords([lat, lng]);
            onChange(addr);
          }}
          onClose={() => setShowMap(false)}
        />
      )}

      {showDropdown && (suggestions.length > 0 || loading) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 8,
            background: "var(--sur)",
            border: "1px solid var(--bdr)",
            borderRadius: 12,
            boxShadow: "var(--sh2)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: "12px 16px", color: "var(--tx2)", fontSize: "0.875rem" }}>
              Searching...
            </div>
          ) : (
            suggestions.map((item, idx) => (
              <div
                key={item.place_id || idx}
                onClick={() => handleSelect(item)}
                style={{
                  padding: "12px 16px",
                  cursor: "pointer",
                  borderBottom:
                    idx !== suggestions.length - 1 ? "1px solid var(--sur2)" : "none",
                  fontSize: "0.875rem",
                  color: "var(--tx)",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--sur2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontWeight: 600 }}>{item.display_name.split(",")[0]}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--tx2)", marginTop: 2 }}>
                  {item.display_name.split(",").slice(1, 3).join(",")}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
