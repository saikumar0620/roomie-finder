import { getFilePreview } from "../services/listing.service";
import FavoriteButton from "./FavoriteButton";
import { Link } from "react-router-dom";

export default function ListingCard({ listing }) {
  const imgSrc = listing.images?.[0]
    ? getFilePreview(listing.images[0]).toString()
    : "https://placehold.co/600x400/FFF1F2/E11D48?text=No+Image";

  return (
    <Link to={`/listing/${listing.$id}`} style={{ textDecoration: "none", display: "block" }}>
      <div className="card fade-up" style={{ cursor: "pointer" }}>
        {/* Image */}
        <div style={{ position: "relative", overflow: "hidden", height: 200 }}>
          <img
            src={imgSrc}
            loading="lazy"
            alt={listing.title}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transition: "transform 0.4s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
          />
          {/* Gradient overlay */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
            background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)",
          }} />

          {/* Rented Overlay */}
          {listing.isAvailable === false && (
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(2px)"
            }}>
              <span style={{
                background: "var(--p)", color: "#fff", padding: "8px 16px", borderRadius: 8,
                fontSize: "1.125rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase"
              }}>
                Rented
              </span>
            </div>
          )}
          {/* Rent badge */}
          <div style={{
            position: "absolute", bottom: 12, left: 14,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            padding: "3px 10px",
            borderRadius: 100,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--p)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}>
            ₹{listing.rent?.toLocaleString()}/mo
          </div>
          {/* Favorite */}
          <div style={{ position: "absolute", top: 10, right: 10 }}>
            <FavoriteButton listingId={listing.$id} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 20px 20px" }}>
          <h3 style={{
            margin: 0, fontSize: "1rem", fontWeight: 600,
            color: "var(--tx)", letterSpacing: "-0.01em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {listing.title}
          </h3>
          <p style={{ margin: "4px 0 12px", fontSize: "0.8125rem", color: "var(--tx2)", display: "flex", alignItems: "center", gap: 4 }}>
            📍 {listing.location}
          </p>
          {listing.preferences && (
            <span className="tag" style={{ marginBottom: 12 }}>
              {listing.preferences}
            </span>
          )}
          <div style={{
            marginTop: 4,
            padding: "8px 14px",
            background: "var(--p-l)",
            borderRadius: 10,
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "var(--p)",
            textAlign: "center",
            transition: "background 0.2s ease",
          }}>
            View Details →
          </div>
        </div>
      </div>
    </Link>
  );
}