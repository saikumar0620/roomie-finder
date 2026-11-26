import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getListingById, getFilePreview, reportListing } from "../services/listing.service";
import FavoriteButton from "../components/FavoriteButton";
import { getOrCreateConversation } from "../services/chat.service";
import { useAuthStore } from "../store/useAuthStore";
import ImageCarousel from "../components/ImageCarousel";
import toast from "react-hot-toast";

const REPORT_REASONS = [
  "Fake or scam listing",
  "Wrong price or location",
  "Already rented",
  "Inappropriate content",
  "Other",
];

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    setReporting(true);
    try {
      await reportListing(id, reportReason, reportDetails);
      toast.success("Listing reported. Thank you for keeping the community safe.");
      setShowReportModal(false);
      setReportDetails("");
    } catch (err) {
      toast.error(err?.message || "Failed to submit report");
    } finally {
      setReporting(false);
    }
  };

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

  const images = (data.images || []).map((imgId) => getFilePreview(imgId).toString());

  return (
    <div className="wrap fade-up" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 860 }}>
      {/* Image carousel */}
      {images.length > 0 && (
        <div className="mb-8">
          <ImageCarousel
            images={images}
            alt={data.title}
            height="h-[260px] sm:h-[420px]"
            rounded="rounded-2xl"
            showThumbnails
          />
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
      {(data.location || (data.latitude && data.longitude)) && (
        <div style={{ background: "var(--sur)", border: "1px solid var(--bdr)", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 style={{ fontSize: "1.0625rem", margin: 0 }}>
              {data.latitude && data.longitude ? "📍 Exact Location Map" : "Location Map"}
            </h2>
            <a
              href={
                data.latitude && data.longitude
                  ? `https://www.google.com/maps?q=${data.latitude},${data.longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`
              }
              target="_blank"
              rel="noreferrer"
              className="btn btn-o text-xs py-1.5 px-3 no-underline"
            >
              Open in Maps ↗
            </a>
          </div>
          <div style={{ width: "100%", height: 300, borderRadius: 12, overflow: "hidden", background: "var(--sur2)" }}>
            <iframe
              title="Listing Location Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={
                data.latitude && data.longitude
                  ? `https://maps.google.com/maps?q=${data.latitude},${data.longitude}&t=&z=16&ie=UTF8&iwloc=&output=embed`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(data.location)}&t=&z=13&ie=UTF8&iwloc=&output=embed`
              }
            />
          </div>
        </div>
      )}

      {/* CTA + Report */}
      {user?.$id !== data.userId && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={handleContact} className="btn btn-p flex-1" style={{ padding: "14px", fontSize: "1rem" }}>
            💬 Contact Owner
          </button>
          <button
            type="button"
            onClick={() => (user ? setShowReportModal(true) : navigate("/login"))}
            className="btn btn-o sm:w-auto"
            style={{ padding: "14px 20px", fontSize: "0.9375rem" }}
          >
            🚩 Report
          </button>
        </div>
      )}

      {showReportModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 20,
          }}
        >
          <div className="auth-card fade-up" style={{ width: "100%", maxWidth: 420, padding: 24 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "1.15rem" }}>Report Listing</h3>
            <p style={{ color: "var(--tx2)", fontSize: "0.8125rem", marginBottom: 16 }}>
              Help keep Roomie Finder safe and accurate.
            </p>
            <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
              <div>
                <label className="lbl">Reason</label>
                <select
                  className="inp text-sm"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="lbl">Additional Details (optional)</label>
                <textarea
                  className="inp text-sm"
                  rows={3}
                  placeholder="Share any helpful context..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="btn btn-o" onClick={() => setShowReportModal(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={reporting} className="btn btn-p">
                  {reporting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}