import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getListingById, getFilePreview } from "../services/listing.service";
import FavoriteButton from "../components/FavoriteButton";
import { getOrCreateConversation } from "../services/chat.service";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListingById(id),
  });

  const handleContact = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      const convo = await getOrCreateConversation(user.$id, data.userId, data.$id);
      navigate(`/chat/${convo.$id}`);
    } catch {
      // Contact failed silently — user stays on page
    }
  };

  if (isLoading) return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="skel" style={{ height: 420, borderRadius: 16, marginBottom: 24 }} />
      <div className="skel" style={{ height: 32, width: "50%", marginBottom: 12 }} />
      <div className="skel" style={{ height: 20, width: "30%", marginBottom: 24 }} />
      <div className="skel" style={{ height: 100 }} />
    </div>
  );

  if (!data) return null;

  const images = data.images || [];

  return (
    <div className="wrap fade-up" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 860 }}>
      {/* Image gallery */}
      {images.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: images.length > 1 ? "2fr 1fr" : "1fr",
          gap: 12, borderRadius: 20, overflow: "hidden", marginBottom: 32,
          maxHeight: 420,
        }}>
          {images.slice(0, 3).map((imgId, i) => (
            <img
              key={i}
              src={getFilePreview(imgId).toString()}
              alt={`Photo ${i + 1}`}
              style={{
                width: "100%", height: i === 0 ? 420 : 204, objectFit: "cover",
                gridRow: i === 0 ? "1 / 3" : "auto",
                transition: "transform 0.3s ease",
              }}
            />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 6px" }}>{data.title}</h1>
          <p style={{ color: "var(--tx2)", fontSize: "0.9375rem", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            📍 {data.location}
          </p>
        </div>
        <FavoriteButton listingId={data.$id} />
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <div style={{ background: "linear-gradient(135deg, var(--p), var(--sec))", borderRadius: 14, padding: "16px 24px", color: "#fff", minWidth: 140 }}>
          <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: 4 }}>Monthly Rent</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>₹{data.rent?.toLocaleString()}</div>
        </div>
        {data.preferences && (
          <div style={{ background: "var(--sur2)", borderRadius: 14, padding: "16px 24px", border: "1px solid var(--bdr)", minWidth: 140 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--tx2)", marginBottom: 4 }}>Preference</div>
            <div style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--tx)", textTransform: "capitalize" }}>{data.preferences}</div>
          </div>
        )}
      </div>

      {/* Amenities */}
      {data.amenities && data.amenities.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "1.0625rem", marginBottom: 12 }}>Amenities</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {data.amenities.split(",").map(a => a.trim()).filter(Boolean).map(amenity => (
              <span key={amenity} style={{
                background: "var(--sur)", border: "1px solid var(--bdr)",
                padding: "8px 16px", borderRadius: 20, fontSize: "0.875rem",
                display: "flex", alignItems: "center", gap: 6
              }}>
                <span style={{ color: "var(--p)" }}>✓</span> {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {data.description && (
        <div style={{ background: "var(--sur)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.0625rem", marginBottom: 12 }}>About this place</h2>
          <p style={{ color: "var(--tx2)", lineHeight: 1.7, margin: 0, fontSize: "0.9375rem", whiteSpace: "pre-wrap" }}>{data.description}</p>
        </div>
      )}

      {/* Map View */}
      {data.location && (
        <div style={{ background: "var(--sur)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.0625rem", marginBottom: 16 }}>Location Map</h2>
          <div style={{ width: "100%", height: 300, borderRadius: 12, overflow: "hidden", background: "var(--sur2)" }}>
            <iframe
              title="Listing Location Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(data.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      {user?.$id !== data.userId && (
        <button onClick={handleContact} className="btn btn-p" style={{ width: "100%", padding: "14px", fontSize: "1rem" }}>
          💬 Contact Owner
        </button>
      )}
    </div>
  );
}