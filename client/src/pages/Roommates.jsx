import { useQuery } from "@tanstack/react-query";
import { getRoommatesWanted, getProfile } from "../services/profile.service";
import { getFilePreview } from "../services/listing.service";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import { getOrCreateConversation } from "../services/chat.service";

export default function Roommates() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["roommates"],
    queryFn: getRoommatesWanted,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["profile", user?.$id],
    queryFn: () => getProfile(user?.$id),
    enabled: !!user,
  });

  const calculateMatch = (theirHabitsStr) => {
    if (!myProfile?.habits || !theirHabitsStr) return null;
    const myHabits = myProfile.habits.split(",").map(h => h.trim().toLowerCase()).filter(Boolean);
    const theirHabits = theirHabitsStr.split(",").map(h => h.trim().toLowerCase()).filter(Boolean);
    
    if (myHabits.length === 0 && theirHabits.length === 0) return null;
    if (myHabits.length === 0 || theirHabits.length === 0) return 0;
    
    const intersection = myHabits.filter(h => theirHabits.includes(h)).length;
    const union = new Set([...myHabits, ...theirHabits]).size;
    
    return Math.round((intersection / union) * 100);
  };

  const handleContact = async (targetUserId) => {
    if (!user) { navigate("/login"); return; }
    try {
      const convo = await getOrCreateConversation(user.$id, targetUserId, "general");
      navigate(`/chat/${convo.$id}`);
    } catch {
      // Contact failed silently — user stays on page
    }
  };

  return (
    <div className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      {/* Hero */}
      <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
        <span className="badge" style={{ marginBottom: 12 }}>🙋‍♂️ Find a Roommate</span>
        <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 700, letterSpacing: "-0.04em", margin: "12px 0 8px" }}>
          Looking for a place to stay
        </h1>
        <p style={{ color: "var(--tx2)", fontSize: "1rem", maxWidth: 480, margin: "0 auto" }}>
          Have an extra room? Browse through people who are actively looking for a roommate.
        </p>
      </div>

      {isLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skel" style={{ height: 280, borderRadius: 20 }} />
          ))}
        </div>
      )}

      {!isLoading && profiles.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🦗</div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: 8 }}>No one is looking right now</h2>
          <p style={{ color: "var(--tx2)", fontSize: "0.875rem" }}>
            Check back later to see if anyone needs a room.
          </p>
        </div>
      )}

      <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
        {profiles.map(prof => {
          const matchPercent = calculateMatch(prof.habits);
          
          return (
            <div key={prof.$id} className="card" style={{ padding: 0, display: "flex", flexDirection: "column", position: "relative" }}>
              
              <div style={{ padding: 24, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, var(--p), var(--sec))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "1.5rem", fontWeight: 700,
                    backgroundImage: prof.avatarId ? `url(${getFilePreview(prof.avatarId)})` : "none",
                    backgroundSize: "cover", backgroundPosition: "center",
                    boxShadow: "0 4px 12px var(--p-glow)"
                  }}>
                    {!prof.avatarId && "U"}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "1.125rem", fontWeight: 700, color: "var(--tx)" }}>
                      {prof.name ? prof.name : `Roommate ${prof.userId.slice(-4)}`}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--tx2)", display: "flex", alignItems: "center", gap: 4 }}>
                      📍 Seeking a Room
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--tx3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Looking for</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--tx)" }}>Room</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--tx3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Profile</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--tx)" }}>Verified</p>
                  </div>
                </div>

                {prof.habits && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {prof.habits.split(",").map(h => h.trim()).filter(Boolean).slice(0, 3).map(habit => (
                      <span key={habit} className="tag" style={{ fontSize: "0.75rem", padding: "4px 8px", background: "var(--sur2)" }}>
                        {habit}
                      </span>
                    ))}
                    {prof.habits.split(",").filter(Boolean).length > 3 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--p)", fontWeight: 600, padding: "4px 4px" }}>
                        +{prof.habits.split(",").filter(Boolean).length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="divider" style={{ margin: 0 }} />
              
              <div style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--sur2)" }}>
                <div>
                  {matchPercent !== null ? (
                    <div style={{
                      fontSize: "0.875rem", fontWeight: 700,
                      color: matchPercent > 50 ? "var(--p)" : "var(--tx2)", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {matchPercent > 0 && <span className="glow-pulse" style={{ display: "inline-block" }}>✨</span>} 
                      {matchPercent}% Match
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.8125rem", color: "var(--tx3)" }}>No matching data</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {user?.$id !== prof.userId ? (
                    <button 
                      onClick={() => handleContact(prof.userId)} 
                      style={{ 
                        width: 40, height: 40, borderRadius: "50%", border: "none", 
                        background: "linear-gradient(135deg, var(--p), var(--sec))", color: "#fff", 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", boxShadow: "0 4px 12px var(--p-glow)", transition: "transform 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                      💬
                    </button>
                  ) : (
                    <div style={{ fontSize: "0.8125rem", color: "var(--tx3)", fontWeight: 500, padding: "8px 0" }}>This is you</div>
                  )}
                </div>
              </div>
            </div>
          );})}
      </div>
    </div>
  );
}
