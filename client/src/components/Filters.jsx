import { useState } from "react";
import LocationAutocomplete from "./LocationAutocomplete";

const AMENITIES_LIST = [
  { id: "WiFi", icon: "📶" },
  { id: "AC", icon: "❄️" },
  { id: "Gym", icon: "🏋️" },
  { id: "Parking", icon: "🚗" },
  { id: "Attached Washroom", icon: "🚿" },
  { id: "Washing Machine", icon: "🧺" },
  { id: "Power Backup", icon: "⚡" },
  { id: "Geyser", icon: "♨️" },
  { id: "Balcony", icon: "🪴" },
];

const RADIUS_OPTIONS = [2, 5, 10];

export default function Filters({
  onApply,
  showNearMe = false,
  isNearbyActive = false,
  locatingNearby = false,
  radiusKm = 5,
  onToggleNearMe,
  onChangeRadius,
}) {
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [location, setLocation] = useState("");
  const [preferences, setPreferences] = useState("");
  const [amenities, setAmenities] = useState([]);

  const toggleAmenity = (amenity) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onApply({ minRent, maxRent, location, preferences, amenities });
  };

  const handleReset = () => {
    setMinRent("");
    setMaxRent("");
    setLocation("");
    setPreferences("");
    setAmenities([]);
    onApply({});
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 sm:p-6 mb-8"
      style={{
        background: "var(--sur)",
        border: "1px solid var(--bdr)",
        borderRadius: 20,
        boxShadow: "var(--sh2)",
      }}
    >
      {/* Nearby Quick-Discovery Strip (logged-in users) */}
      {showNearMe && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b"
          style={{ borderColor: "var(--bdr)" }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                background: isNearbyActive ? "#10b981" : "var(--p)",
                boxShadow: isNearbyActive
                  ? "0 0 0 4px rgba(16,185,129,0.18)"
                  : "0 0 0 4px var(--p-glow)",
              }}
            />
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--tx)" }}>
                {isNearbyActive
                  ? `Nearby mode active (${radiusKm} km radius)`
                  : "Find rooms around your current location"}
              </div>
              <div className="text-xs" style={{ color: "var(--tx2)" }}>
                {isNearbyActive
                  ? "Sorted closest to you first"
                  : "Instantly filter available rooms within 5 km using GPS"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isNearbyActive ? (
              <>
                <div
                  className="inline-flex items-center p-1 rounded-xl border"
                  style={{
                    background: "var(--sur2)",
                    borderColor: "var(--bdr)",
                  }}
                >
                  {RADIUS_OPTIONS.map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => onChangeRadius?.(km)}
                      className="border-0 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        background:
                          radiusKm === km ? "var(--p)" : "transparent",
                        color: radiusKm === km ? "#fff" : "var(--tx2)",
                      }}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onToggleNearMe}
                  className="btn btn-o text-xs py-1.5 px-3"
                >
                  Clear ✕
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onToggleNearMe}
                disabled={locatingNearby}
                className="btn btn-p text-xs sm:text-sm py-2 px-4 w-full sm:w-auto justify-center"
              >
                {locatingNearby ? "📍 Detecting GPS..." : "📍 Rooms Near Me (5 km)"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="lbl">Min Rent (₹)</label>
          <input
            type="number"
            placeholder="0"
            className="inp"
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="lbl">Max Rent (₹)</label>
          <input
            type="number"
            placeholder="Any"
            className="inp"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <label className="lbl">Location</label>
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            placeholder="City or area..."
          />
        </div>

        <div className="lg:col-span-2">
          <label className="lbl">Preference</label>
          <select
            className="inp"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            style={{ appearance: "none", cursor: "pointer" }}
          >
            <option value="">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="couple">Couple</option>
            <option value="student">Student</option>
            <option value="professional">Professional</option>
            <option value="any">No preference</option>
          </select>
        </div>

        <div className="lg:col-span-2 flex gap-2">
          <button type="submit" className="btn btn-p flex-1 justify-center">
            Search
          </button>
          <button
            type="button"
            className="btn btn-o justify-center"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-4">
        <label className="lbl mb-2 block">Amenities</label>
        <div className="flex flex-wrap gap-2">
          {AMENITIES_LIST.map(({ id, icon }) => (
            <label
              key={id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8125rem",
                cursor: "pointer",
                background: amenities.includes(id)
                  ? "var(--p-light, rgba(225, 29, 72, 0.08))"
                  : "var(--sur2)",
                color: amenities.includes(id) ? "var(--p)" : "var(--tx2)",
                border: `1px solid ${amenities.includes(id) ? "var(--p)" : "var(--bdr)"}`,
                padding: "6px 12px",
                borderRadius: 20,
                transition: "all 0.2s",
              }}
            >
              <input
                type="checkbox"
                style={{ display: "none" }}
                checked={amenities.includes(id)}
                onChange={() => toggleAmenity(id)}
              />
              <span>{icon}</span> {id}
            </label>
          ))}
        </div>
      </div>
    </form>
  );
}
