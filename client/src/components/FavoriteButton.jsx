import { useFavorites } from "../hooks/useFavorites";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { useState } from "react";

export default function FavoriteButton({ listingId }) {
  const { user } = useAuthStore();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const [animating, setAnimating] = useState(false);
  const fav = isFavorite(listingId);

  const handleClick = (e) => {
    e.preventDefault();
    if (!user) { toast.error("Login to save listings"); return; }
    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);
    if (fav) {
      removeFavorite({ docId: fav.$id });
      toast.success("Removed from saved");
    } else {
      addFavorite({ listingId });
      toast.success("Saved!");
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        width: 34, height: 34,
        borderRadius: "50%",
        border: "none",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(10px)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        transform: animating ? "scale(1.3)" : "scale(1)",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(225,29,72,0.25)"; }}
      onMouseLeave={e => { if (!animating) e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)"; }}
    >
      {fav ? "❤️" : "🤍"}
    </button>
  );
}