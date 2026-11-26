import { useState } from "react";
import { useListings } from "../hooks/useListings";
import ListingCard from "../components/ListingCard";
import Filters from "../components/Filters";
import ListingSkeleton from "../components/ListingSkeleton";

export default function Home() {
  const [filters, setFilters] = useState({});
  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useListings(filters);

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* Hero */}
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 64, marginTop: 20 }}>
        <span className="badge" style={{ marginBottom: 16, padding: "6px 16px", fontSize: "0.8125rem", boxShadow: "0 4px 12px var(--p-glow)" }}>
          Find your room, right in your hands
        </span>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: 800, letterSpacing: "-0.04em", margin: "16px 0 20px", lineHeight: 1.1 }}>
          Your next home, <br/>
          <span className="grad-text">waiting for you.</span>
        </h1>
        <p style={{ color: "var(--tx2)", fontSize: "1.125rem", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
          Discover verified roommates, browse premium listings, and seamlessly message owners — all in one beautifully designed space.
        </p>
      </div>

      {/* Filters */}
      <Filters onApply={setFilters} />

      {/* Error */}
      {isError && (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: "var(--sur)", borderRadius: 16,
          border: "1px solid var(--bdr)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: "var(--p)", fontWeight: 600, marginBottom: 6 }}>Failed to load listings</p>
          <p style={{ color: "var(--tx2)", fontSize: "0.875rem" }}>{error.message}</p>
        </div>
      )}

      {/* Skeleton grid */}
      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {[...Array(6)].map((_, i) => <ListingSkeleton key={i} />)}
        </div>
      )}

      {/* Listings grid */}
      {!isLoading && !isError && (() => {
        const listings = data?.pages.flatMap(p => p.documents) ?? [];
        return (
          <>
            {listings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🏘️</div>
                <h2 style={{ fontSize: "1.25rem", marginBottom: 8 }}>No listings found</h2>
                <p style={{ color: "var(--tx2)", fontSize: "0.875rem" }}>
                  Try adjusting your filters or be the first to post a listing.
                </p>
              </div>
            ) : (
              <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
                {listings.map(l => <ListingCard key={l.$id} listing={l} />)}
              </div>
            )}

            {hasNextPage && (
              <div style={{ textAlign: "center", marginTop: 40 }}>
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn btn-o"
                  style={{ minWidth: 160 }}
                >
                  {isFetchingNextPage ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}