import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useUserListings } from "../hooks/useUserListings";
import { useFavoriteListings } from "../hooks/useFavoriteListings";
import { useFavorites } from "../hooks/useFavorites";
import { deleteListing } from "../services/listing.service";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getProfile } from "../services/profile.service";
import { getFilePreview } from "../services/listing.service";

export default function Profile() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: listings = [], refetch } = useUserListings();
  const { data: favoriteListings = [] } = useFavoriteListings();
  const { removeFavorite, favorites } = useFavorites();
  const [activeTab, setActiveTab] = useState("listings");
  const [loadingId, setLoadingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.$id],
    queryFn: () => getProfile(user?.$id),
    enabled: !!user,
  });

  const handleDeleteClick = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoadingId(deleteId);
    try {
      await deleteListing(deleteId);
      toast.success("Listing deleted");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoadingId(null);
      setDeleteId(null);
    }
  };

  return (
    <div className="wrap fade-up" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* Profile card */}
      <div style={{
        background: "var(--sur)", border: "1px solid var(--bdr)",
        borderRadius: 20, padding: "32px", marginBottom: 40,
        boxShadow: "var(--sh2)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--p), var(--sec))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: "2rem", fontWeight: 700,
            backgroundImage: profile?.avatarId ? `url(${getFilePreview(profile.avatarId)})` : "none",
            backgroundSize: "cover", backgroundPosition: "center",
            boxShadow: "0 4px 16px var(--p-glow)", flexShrink: 0,
          }}>
            {!profile?.avatarId && (user?.name?.charAt(0).toUpperCase() || "U")}
          </div>
          
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>{user?.name}</h1>
            <p style={{ color: "var(--tx2)", fontSize: "0.9375rem", margin: "0 0 16px" }}>{user?.email}</p>
            
            {profile?.bio && (
              <p style={{ color: "var(--tx)", lineHeight: 1.6, fontSize: "0.9375rem", marginBottom: 16 }}>
                {profile.bio}
              </p>
            )}

            {profile?.habits && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile.habits.split(",").map(h => h.trim()).filter(Boolean).map((habit, i) => (
                  <span key={i} className="tag" style={{ background: "var(--sur2)" }}>{habit}</span>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link to="/profile/edit" className="btn btn-o" style={{ textDecoration: "none" }}>
              Edit Profile
            </Link>
            <Link to="/create" className="btn btn-p" style={{ textDecoration: "none" }}>
              + Post Room
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, borderBottom: "1px solid var(--bdr)" }}>
        <button
          onClick={() => setActiveTab("listings")}
          style={{
            background: "none", border: "none", padding: "12px 16px",
            fontSize: "1rem", fontWeight: activeTab === "listings" ? 600 : 500,
            color: activeTab === "listings" ? "var(--p)" : "var(--tx2)",
            borderBottom: activeTab === "listings" ? "2px solid var(--p)" : "2px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8
          }}
        >
          My Listings
          <span style={{
            background: activeTab === "listings" ? "var(--p)" : "var(--bdr)",
            color: activeTab === "listings" ? "#fff" : "var(--tx2)",
            padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem"
          }}>{listings.length}</span>
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          style={{
            background: "none", border: "none", padding: "12px 16px",
            fontSize: "1rem", fontWeight: activeTab === "favorites" ? 600 : 500,
            color: activeTab === "favorites" ? "var(--p)" : "var(--tx2)",
            borderBottom: activeTab === "favorites" ? "2px solid var(--p)" : "2px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8
          }}
        >
          Favorites
          <span style={{
            background: activeTab === "favorites" ? "var(--p)" : "var(--bdr)",
            color: activeTab === "favorites" ? "#fff" : "var(--tx2)",
            padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem"
          }}>{favoriteListings.length}</span>
        </button>
      </div>

      {activeTab === "listings" && (
        <>
          {listings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 24px", background: "var(--sur)", borderRadius: 16, border: "1px solid var(--bdr)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
              <p style={{ color: "var(--tx2)", fontSize: "0.9375rem" }}>You haven't posted any listings yet.</p>
              <Link to="/create" className="btn btn-p" style={{ textDecoration: "none", marginTop: 16, display: "inline-flex" }}>
                Post your first room
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {listings.map(l => {
                const imgSrc = l.images?.[0] ? getFilePreview(l.images[0]).toString() : "https://placehold.co/600x400/FFF1F2/E11D48?text=No+Image";
                return (
                  <div key={l.$id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ position: "relative", height: 160, width: "100%" }}>
                      <img src={imgSrc} alt={l.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <h3 style={{ fontSize: "1rem", margin: 0, flex: 1, paddingRight: 8 }}>{l.title}</h3>
                      <span className="badge">₹{Number(l.rent).toLocaleString()}</span>
                    </div>
                    <p style={{ color: "var(--tx2)", fontSize: "0.8125rem", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                      📍 {l.location}
                    </p>
                  </div>
                  <div className="divider" style={{ margin: 0 }} />
                  <div style={{ padding: "12px 20px 16px", display: "flex", gap: 10 }}>
                    <Link to={`/edit/${l.$id}`} className="btn btn-o" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteClick(l.$id)}
                      disabled={loadingId === l.$id}
                      className="btn"
                      style={{
                        flex: 1, background: "rgba(225,29,72,0.08)", color: "var(--p)",
                        border: "1.5px solid rgba(225,29,72,0.15)",
                      }}
                    >
                      {loadingId === l.$id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "favorites" && (
        <>
          {favoriteListings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "64px 24px", background: "var(--sur)", borderRadius: 16, border: "1px solid var(--bdr)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❤️</div>
              <p style={{ color: "var(--tx2)", fontSize: "0.9375rem" }}>You haven't added any listings to your favorites.</p>
              <Link to="/" className="btn btn-p" style={{ textDecoration: "none", marginTop: 16, display: "inline-flex" }}>
                Browse rooms
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {favoriteListings.map(l => {
                // Find the favorite document ID to be able to remove it
                const favoriteDoc = favorites.find(f => f.listingId === l.$id);
                const imgSrc = l.images?.[0] ? getFilePreview(l.images[0]).toString() : "https://placehold.co/600x400/FFF1F2/E11D48?text=No+Image";
                return (
                  <div key={l.$id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ position: "relative", height: 160, width: "100%" }}>
                      <img src={imgSrc} alt={l.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <h3 style={{ fontSize: "1rem", margin: 0, flex: 1, paddingRight: 8 }}>{l.title}</h3>
                        <span className="badge">₹{Number(l.rent).toLocaleString()}</span>
                      </div>
                      <p style={{ color: "var(--tx2)", fontSize: "0.8125rem", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                        📍 {l.location}
                      </p>
                    </div>
                    <div className="divider" style={{ margin: 0 }} />
                    <div style={{ padding: "12px 20px 16px", display: "flex", gap: 10 }}>
                      <Link to={`/listing/${l.$id}`} className="btn btn-o" style={{ textDecoration: "none", flex: 1, justifyContent: "center" }}>
                        View
                      </Link>
                      <button
                        onClick={() => favoriteDoc && removeFavorite({ docId: favoriteDoc.$id })}
                        className="btn"
                        style={{
                          flex: 1, background: "rgba(225,29,72,0.08)", color: "var(--p)",
                          border: "1.5px solid rgba(225,29,72,0.15)",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {deleteId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 24, animation: "fadeUp 0.2s ease"
        }}>
          <div className="auth-card fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 8px" }}>Delete Listing?</h2>
            <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginBottom: 24 }}>
              This action cannot be undone. Are you sure you want to permanently remove this room listing?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-o" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-p" style={{ background: "var(--p)" }} onClick={confirmDelete}>
                {loadingId === deleteId ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}