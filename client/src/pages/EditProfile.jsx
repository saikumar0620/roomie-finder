import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { getProfile, upsertProfile, uploadAvatar } from "../services/profile.service";
import { getFilePreview } from "../services/listing.service";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function EditProfile() {
  const { user, updateUserName } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [form, setForm] = useState({ name: "", bio: "", habits: "", upiId: "" });
  const [lookingForRoom, setLookingForRoom] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    if (user?.$id) {
      getProfile(user.$id).then(prof => {
        if (prof) {
          setProfileId(prof.$id);
          setForm({
            name: prof.name || user.name || "",
            bio: prof.bio || "",
            habits: prof.habits || "",
            upiId: prof.upiId || "",
          });
          if (prof.avatarId) {
            setAvatarUrl(getFilePreview(prof.avatarId).toString());
          }
          if (prof.lookingForRoom !== undefined) {
            setLookingForRoom(prof.lookingForRoom);
          }
        }
      });
    }
  }, [user?.$id]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalAvatarId = undefined;
      
      if (avatarFile) {
        toast.loading("Uploading avatar...");
        finalAvatarId = await uploadAvatar(avatarFile);
        toast.dismiss();
      }

      const data = {
        name: form.name || user.name || "Anonymous",
        bio: form.bio,
        habits: form.habits,
        upiId: form.upiId?.trim() || null,
        lookingForRoom,
      };

      if (finalAvatarId) {
        data.avatarId = finalAvatarId;
      }

      const savedProfile = await upsertProfile(user.$id, data, profileId);
      updateUserName(data.name);
      queryClient.setQueryData(["profile", user.$id], savedProfile);
      queryClient.invalidateQueries({ queryKey: ["profile", user.$id] });
      queryClient.invalidateQueries({ queryKey: ["roommates"] });
      queryClient.invalidateQueries({ queryKey: ["room_dashboard"] });
      toast.success("Profile saved successfully!");
      navigate("/profile");
    } catch (err) {
      toast.dismiss();
      toast.error(err?.message || "Failed to save profile.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e) => {
    if (e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setAvatarUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 480 }} className="fade-up">
        <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>Edit Profile</h1>
        <p style={{ color: "var(--tx2)", marginBottom: 32 }}>Tell potential roommates a bit about yourself.</p>

        <div style={{ background: "var(--sur)", border: "1px solid var(--bdr)", borderRadius: 20, padding: 32, boxShadow: "var(--sh2)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, var(--p), var(--sec))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "2rem", fontWeight: 700,
                backgroundImage: avatarUrl ? `url(${avatarUrl})` : "none",
                backgroundSize: "cover", backgroundPosition: "center",
                flexShrink: 0,
              }}>
                {!avatarUrl && (user?.name?.charAt(0).toUpperCase() || "U")}
              </div>
              
              <div>
                <input type="file" accept="image/*" id="avatar" style={{ display: "none" }} onChange={handleAvatarSelect} />
                <label htmlFor="avatar" className="btn btn-o" style={{ cursor: "pointer", padding: "8px 16px", fontSize: "0.875rem" }}>
                  Change Photo
                </label>
              </div>
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
              padding: "16px 20px", background: lookingForRoom ? "var(--p-light, rgba(79, 70, 229, 0.1))" : "var(--sur2)",
              borderRadius: 12, border: `1px solid ${lookingForRoom ? "var(--p)" : "var(--bdr)"}`
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "1rem", color: lookingForRoom ? "var(--p)" : "var(--tx)" }}>
                  Looking for a Roommate
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--tx2)", lineHeight: 1.4 }}>
                  If turned on, you will appear on the public Roommates list so landlords can find you.
                </p>
              </div>
              <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, flexShrink: 0 }}>
                <input type="checkbox" checked={lookingForRoom} onChange={(e) => setLookingForRoom(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: lookingForRoom ? "var(--acc)" : "var(--tx3)", transition: ".4s", borderRadius: 24
                }}>
                  <span style={{
                    position: "absolute", content: '""', height: 18, width: 18, left: 3, bottom: 3,
                    backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                    transform: lookingForRoom ? "translateX(20px)" : "translateX(0)"
                  }} />
                </span>
              </label>
            </div>

            <div>
              <label className="lbl">Display Name</label>
              <input 
                className="inp" 
                placeholder="What should we call you?" 
                value={form.name} 
                onChange={set("name")} 
              />
            </div>

            <div>
              <label className="lbl">About Me (Bio)</label>
              <textarea 
                className="inp" 
                placeholder="I'm a software engineer who loves cooking..." 
                value={form.bio} 
                onChange={set("bio")} 
                rows={4} 
              />
            </div>

            <div>
              <label className="lbl">Habits & Lifestyle</label>
              <input 
                className="inp" 
                placeholder="e.g., Non-smoker, Early Bird, Pet Friendly" 
                value={form.habits} 
                onChange={set("habits")} 
              />
              <p style={{ fontSize: "0.75rem", color: "var(--tx2)", marginTop: 6 }}>Separate with commas.</p>
            </div>

            <div>
              <label className="lbl">UPI ID (optional, for instant expense settlements)</label>
              <input
                className="inp"
                placeholder="e.g., yourname@okicici or 9876543210@ybl"
                value={form.upiId}
                onChange={set("upiId")}
              />
            </div>

            <button type="submit" className="btn btn-p" disabled={loading} style={{ width: "100%", padding: "13px", marginTop: 8 }}>
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
