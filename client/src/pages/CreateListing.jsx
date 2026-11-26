import { useState, useEffect, useMemo } from "react";
import { createListing, updateListing, getListingById, uploadImages, getFilePreview } from "../services/listing.service";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import LocationAutocomplete from "../components/LocationAutocomplete";
import ImageCarousel from "../components/ImageCarousel";

const MAX_IMAGES = 5;

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

const Field = ({ label, children }) => (
  <div>
    <label className="lbl">{label}</label>
    {children}
  </div>
);

export default function CreateListing() {
  const { listingId } = useParams();
  const isEdit = !!listingId;
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({ title: "", rent: "", location: "", description: "", preferences: "" });
  const [isAvailable, setIsAvailable] = useState(true);
  const [amenities, setAmenities] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const filePreviews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files]
  );

  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  const allPreviewUrls = useMemo(
    () => [
      ...existingImages.map((img) => getFilePreview(img).toString()),
      ...filePreviews,
    ],
    [existingImages, filePreviews]
  );

  useEffect(() => {
    if (isEdit) {
      getListingById(listingId).then(data => {
        setForm({ title: data.title || "", rent: data.rent || "", location: data.location || "", description: data.description || "", preferences: data.preferences || "" });
        setAmenities(data.amenities ? data.amenities.split(",").map(a => a.trim()) : []);
        setExistingImages(data.images || []);
        if (data.isAvailable !== undefined) setIsAvailable(data.isAvailable);
      });
    }
  }, [isEdit, listingId]);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const toggleAmenity = (amenity) => {
    setAmenities(prev => 
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const remainingSlots = MAX_IMAGES - (existingImages.length + files.length);
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per listing`);
      e.target.value = "";
      return;
    }

    const toAdd = selected.slice(0, remainingSlots);
    if (selected.length > remainingSlots) {
      toast.error(`Only ${MAX_IMAGES} images allowed. Added ${toAdd.length} more.`);
    }
    setFiles((prev) => [...prev, ...toAdd]);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.rent || !form.location) { toast.error("Fill required fields"); return; }
    setLoading(true);
    try {
      let uploadedUrls = [];
      if (files.length > 0) {
        toast.loading("Uploading images...");
        uploadedUrls = await uploadImages(files);
        toast.dismiss();
      }
      const imageUrls = [...existingImages, ...uploadedUrls].slice(0, MAX_IMAGES);
      const data = { 
        title: form.title, 
        rent: Number(form.rent), 
        location: form.location, 
        userId: user.$id,
        isAvailable,
        images: imageUrls,
      };
      if (form.description) data.description = form.description;
      if (form.preferences) data.preferences = form.preferences;
      if (amenities.length > 0) data.amenities = amenities.join(", ");
      if (isEdit) {
        await updateListing(listingId, data);
        toast.success("Listing updated");
      } else {
        await createListing(data);
        toast.success("Listing created!");
      }
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      queryClient.invalidateQueries({ queryKey: ["myListings"] });
      navigate("/");
    } catch (err) {
      toast.dismiss();
      toast.error(err?.message || (isEdit ? "Failed to update listing" : "Failed to create listing"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 60px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ width: "100%", maxWidth: 560 }} className="fade-up">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <span className="badge" style={{ marginBottom: 12 }}>{isEdit ? "✏️ Edit" : "🏠 New listing"}</span>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>{isEdit ? "Edit Listing" : "Post a Room"}</h1>
          <p style={{ color: "var(--tx2)", marginTop: 6, fontSize: "0.875rem" }}>
            {isEdit ? "Update your listing details below." : "Fill in the details to find your perfect roommate."}
          </p>
        </div>

        <div style={{ background: "var(--sur)", border: "1px solid var(--bdr)", borderRadius: 20, padding: 32, boxShadow: "var(--sh2)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {isEdit && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px", background: isAvailable ? "var(--sur2)" : "rgba(225,29,72,0.1)",
                borderRadius: 12, border: `1px solid ${isAvailable ? "var(--bdr)" : "rgba(225,29,72,0.2)"}`
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: isAvailable ? "var(--tx)" : "var(--p)" }}>
                    {isAvailable ? "Room is Available" : "Room is Rented / Unavailable"}
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--tx2)" }}>
                    {isAvailable ? "This listing is visible in search results." : "This listing is hidden from search results."}
                  </p>
                </div>
                <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
                  <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{
                    position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: isAvailable ? "var(--acc)" : "var(--tx3)", transition: ".4s", borderRadius: 24
                  }}>
                    <span style={{
                      position: "absolute", content: '""', height: 18, width: 18, left: 3, bottom: 3,
                      backgroundColor: "white", transition: ".4s", borderRadius: "50%",
                      transform: isAvailable ? "translateX(20px)" : "translateX(0)"
                    }} />
                  </span>
                </label>
              </div>
            )}

            <Field label="Title *">
              <input className="inp" placeholder="e.g. Cozy 1BHK near Metro" value={form.title} onChange={set("title")} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="Monthly Rent (₹) *">
                <input type="number" className="inp" placeholder="e.g. 8000" value={form.rent} onChange={set("rent")} />
              </Field>
              <Field label="Preference">
                <select className="inp" value={form.preferences} onChange={set("preferences")} style={{ appearance: "none", cursor: "pointer" }}>
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="couple">Couple</option>
                  <option value="student">Student</option>
                  <option value="professional">Professional</option>
                  <option value="any">Any</option>
                </select>
              </Field>
            </div>

            <Field label="Location *">
              <LocationAutocomplete 
                value={form.location} 
                onChange={(val) => setForm(f => ({ ...f, location: val }))} 
                placeholder="e.g. Koramangala, Bangalore"
                showCurrentLocation
              />
            </Field>

            <Field label="Description">
              <textarea className="inp" placeholder="Describe the room, amenities, house rules..." value={form.description} onChange={set("description")} rows={4} style={{ resize: "vertical", lineHeight: 1.6 }} />
            </Field>

            <Field label="Amenities">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {AMENITIES_LIST.map(({ id, icon }) => (
                  <label key={id} style={{
                    display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", cursor: "pointer",
                    background: amenities.includes(id) ? "var(--p-light, rgba(225, 29, 72, 0.08))" : "var(--sur2)",
                    color: amenities.includes(id) ? "var(--p)" : "var(--tx2)",
                    border: `1px solid ${amenities.includes(id) ? "var(--p)" : "var(--bdr)"}`,
                    padding: "6px 12px", borderRadius: 20, transition: "all 0.2s"
                  }}>
                    <input 
                      type="checkbox" 
                      style={{ display: "none" }}
                      checked={amenities.includes(id)}
                      onChange={() => toggleAmenity(id)} 
                    />
                    <span style={{ fontSize: "1rem" }}>{icon}</span> {id}
                  </label>
                ))}
              </div>
            </Field>

            <Field label={`Photos (${allPreviewUrls.length}/${MAX_IMAGES})`}>
              {allPreviewUrls.length < MAX_IMAGES && (
                <div
                  style={{
                    border: "2px dashed var(--bdr)", borderRadius: 12, padding: "20px",
                    textAlign: "center", cursor: "pointer", transition: "border-color 0.2s ease",
                    background: "var(--sur2)",
                    marginBottom: allPreviewUrls.length > 0 ? 12 : 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--p)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bdr)"; }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                    id="photos"
                  />
                  <label htmlFor="photos" style={{ cursor: "pointer", display: "block" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                    <p style={{ color: "var(--tx2)", fontSize: "0.875rem", margin: 0 }}>
                      {allPreviewUrls.length > 0
                        ? `Add more photos (${MAX_IMAGES - allPreviewUrls.length} remaining)`
                        : `Click to upload 1 to ${MAX_IMAGES} photos`}
                    </p>
                  </label>
                </div>
              )}

              {allPreviewUrls.length > 0 && (
                <div className="space-y-3 mt-3">
                  <ImageCarousel
                    images={allPreviewUrls}
                    alt="Listing preview"
                    height="h-[220px]"
                    rounded="rounded-xl"
                  />

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
                    {existingImages.map((img, i) => (
                      <div key={`existing-${i}`} style={{ position: "relative", paddingTop: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--bdr)", boxShadow: "var(--sh1)" }}>
                        <img
                          src={getFilePreview(img).toString()}
                          alt="existing"
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <button
                          type="button"
                          onClick={() => setExistingImages(existingImages.filter((_, idx) => idx !== i))}
                          style={{
                            position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", color: "white",
                            border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontSize: 10, backdropFilter: "blur(4px)"
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {filePreviews.map((url, i) => (
                      <div key={`new-${i}`} style={{ position: "relative", paddingTop: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--bdr)", boxShadow: "var(--sh1)" }}>
                        <img
                          src={url}
                          alt="preview"
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, index) => index !== i))}
                          style={{
                            position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", color: "white",
                            border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", fontSize: 10, backdropFilter: "blur(4px)"
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Field>

            <button type="submit" className="btn btn-p" disabled={loading} style={{ width: "100%", padding: "13px", marginTop: 4, fontSize: "0.9375rem" }}>
              {loading ? "Saving..." : (isEdit ? "Update Listing" : "Post Listing")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}