import { useState } from "react";
import toast from "react-hot-toast";
import { useListings } from "../hooks/useListings";
import { useAuthStore } from "../store/useAuthStore";
import ListingCard from "../components/ListingCard";
import Filters from "../components/Filters";
import ListingSkeleton from "../components/ListingSkeleton";

export default function Home() {
  const { user } = useAuthStore();
  const [filters, setFilters] = useState({});
  const [locatingNearby, setLocatingNearby] = useState(false);
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useListings(filters);

  const isNearbyActive = filters.lat !== undefined && filters.lng !== undefined;
  const radiusKm = filters.radiusKm || 5;

  const clearNearMe = () => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next.lat;
      delete next.lng;
      delete next.radiusKm;
      return next;
    });
  };

  const handleToggleNearMe = () => {
    if (isNearbyActive) {
      clearNearMe();
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocatingNearby(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFilters((prev) => ({
          ...prev,
          lat: coords.latitude,
          lng: coords.longitude,
          radiusKm: 5,
        }));
        setLocatingNearby(false);
        toast.success("Showing rooms within 5 km of you!");
      },
      (err) => {
        setLocatingNearby(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please allow location access.");
        } else {
          toast.error("Unable to get your current location");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleChangeRadius = (nextRadius) => {
    setFilters((prev) => ({
      ...prev,
      radiusKm: nextRadius,
    }));
  };

  const handleApplyFilters = (nextFilters) => {
    setFilters((prev) => {
      const merged = { ...nextFilters };
      if (prev.lat !== undefined && prev.lng !== undefined) {
        merged.lat = prev.lat;
        merged.lng = prev.lng;
        merged.radiusKm = prev.radiusKm || 5;
      }
      return merged;
    });
  };

  return (
    <div className="wrap pt-8 pb-16 sm:pt-10">
      {/* Hero */}
      <div className="fade-up text-center mb-10 sm:mb-12 mt-2 sm:mt-4">
        <span
          className="badge"
          style={{
            marginBottom: 16,
            padding: "6px 16px",
            fontSize: "0.8125rem",
            boxShadow: "0 4px 12px var(--p-glow)",
          }}
        >
          Find your room, right in your hands
        </span>
        <h1
          style={{
            fontSize: "clamp(2.25rem, 6vw, 4.25rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            margin: "16px 0 18px",
            lineHeight: 1.1,
          }}
        >
          Your next home, <br />
          <span className="grad-text">waiting for you.</span>
        </h1>
        <p
          style={{
            color: "var(--tx2)",
            fontSize: "1.0625rem",
            maxWidth: 540,
            margin: "0 auto",
            lineHeight: 1.6,
          }}
        >
          Discover verified roommates, browse premium listings, and seamlessly message owners — all in one beautifully designed space.
        </p>
      </div>

      {/* Search & Nearby Filters */}
      <Filters
        onApply={handleApplyFilters}
        showNearMe={!!user}
        isNearbyActive={isNearbyActive}
        locatingNearby={locatingNearby}
        radiusKm={radiusKm}
        onToggleNearMe={handleToggleNearMe}
        onChangeRadius={handleChangeRadius}
      />

      {/* Error */}
      {isError && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            background: "var(--sur)",
            borderRadius: 16,
            border: "1px solid var(--bdr)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: "var(--p)", fontWeight: 600, marginBottom: 6 }}>
            Failed to load listings
          </p>
          <p style={{ color: "var(--tx2)", fontSize: "0.875rem" }}>
            {error.message}
          </p>
        </div>
      )}

      {/* Skeleton grid */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 24 }}>
          {[...Array(6)].map((_, i) => (
            <ListingSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Listings grid */}
      {!isLoading &&
        !isError &&
        (() => {
          const listings = data?.pages.flatMap((p) => p.documents) ?? [];
          const totalCount = data?.pages?.[0]?.pagination?.total ?? listings.length;

          return (
            <>
              {isNearbyActive && listings.length > 0 && (
                <div className="flex items-center justify-between mb-4 px-1 text-sm" style={{ color: "var(--tx2)" }}>
                  <span>
                    📍 Showing <strong style={{ color: "var(--tx)" }}>{totalCount}</strong>{" "}
                    room{totalCount !== 1 ? "s" : ""} within{" "}
                    <strong style={{ color: "var(--p)" }}>{radiusKm} km</strong> • sorted nearest first
                  </span>
                </div>
              )}

              {listings.length === 0 ? (
                <div
                  className="card p-10 sm:p-14 text-center"
                  style={{ maxWidth: 520, margin: "24px auto" }}
                >
                  <div style={{ fontSize: 52, marginBottom: 14 }}>
                    {isNearbyActive ? "📍" : "🏘️"}
                  </div>
                  <h2 style={{ fontSize: "1.25rem", marginBottom: 8 }}>
                    {isNearbyActive
                      ? `No rooms found within ${radiusKm} km`
                      : "No listings found"}
                  </h2>
                  <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginBottom: 20 }}>
                    {isNearbyActive
                      ? "Try expanding your search radius or browse all available rooms."
                      : "Try adjusting your filters or be the first to post a listing."}
                  </p>
                  {isNearbyActive && (
                    <div className="flex flex-wrap justify-center gap-2.5">
                      {radiusKm < 10 && (
                        <button
                          type="button"
                          onClick={() => handleChangeRadius(10)}
                          className="btn btn-p text-sm"
                        >
                          Expand to 10 km
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={clearNearMe}
                        className="btn btn-o text-sm"
                      >
                        Show all rooms
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 24 }}>
                    {listings.map((l) => (
                      <ListingCard key={l.$id} listing={l} />
                    ))}
                  </div>

                  {hasNextPage && (
                    <div style={{ textAlign: "center", marginTop: 48 }}>
                      <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="btn btn-o"
                        style={{ padding: "12px 32px", fontSize: "0.9375rem" }}
                      >
                        {isFetchingNextPage ? "Loading..." : "Load More Listings"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          );
        })()}
    </div>
  );
}
