import { useConversations } from "../hooks/useConversations";
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
// import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../services/profile.service";
import { getFilePreview } from "../services/listing.service";
import { deleteConversation } from "../services/chat.service";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function ConversationCard({ conversation, otherUserId, index, onDelete }) {
  const { data: profile } = useQuery({
    queryKey: ["profile", otherUserId],
    queryFn: () => getProfile(otherUserId),
    enabled: !!otherUserId,
  });

  const navigate = useNavigate();

  return (
    <div
      className="card"
      onClick={() => navigate(`/chat/${conversation.$id}`)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        borderRadius: 14,
        animationDelay: `${index * 60}ms`,
        cursor: "pointer",
        position: "relative"
      }}
    >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            flexShrink: 0,
            background: `linear-gradient(135deg, var(--p), var(--sec))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 600,
            backgroundImage: profile?.avatarId ? `url(${getFilePreview(profile?.avatarId)})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          {!profile?.avatarId && (profile?.bio ? "U" : "💬")}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--tx)" }}>
            {profile?.name ? profile.name : "Roommate"}
          </p>

          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--tx2)" }}>
            Tap to view conversation
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(conversation.$id);
          }}
          className="btn"
          style={{
            background: "rgba(225,29,72,0.08)",
            color: "var(--p)",
            border: "1.5px solid rgba(225,29,72,0.15)",
            padding: "6px 12px",
            fontSize: "0.8125rem"
          }}
        >
          Delete
        </button>
      </div>
  );
}

export default function Inbox() {
  const { user } = useAuthStore();
  const { data = [], isLoading, isError, error, refetch } = useConversations(user?.$id);

  const [deleteId, setDeleteId] = useState(null);

  const handleDeleteClick = (convoId) => {
    setDeleteId(convoId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteConversation(deleteId);
      toast.success("Conversation deleted");
      refetch();
    } catch (e) {
      toast.error("Failed to delete conversation");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="wrap fade-up" style={{ paddingTop: 40, paddingBottom: 60, maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title">Inbox</h1>
        <p className="section-sub">{data.length} conversation{data.length !== 1 ? "s" : ""}</p>
      </div>

      {isError && error?.code === 400 && (
        <div style={{ marginBottom: 24, background: "rgba(245, 158, 11, 0.1)", padding: 20, borderRadius: 16, border: "1px solid rgba(245, 158, 11, 0.2)", color: "var(--tx2)", fontSize: "0.875rem" }}>
          <strong style={{ color: "var(--acc)", display: "block", marginBottom: 8, fontSize: "1rem" }}>Missing Indexes in Appwrite</strong>
          To view your inbox, go to Appwrite Console → Databases → <code>conversations</code> table → <strong>Indexes</strong> tab, and resolve the following error:
          <div style={{ marginTop: 8, padding: 12, background: "rgba(255,255,255,0.5)", borderRadius: 8, color: "#b91c1c", fontWeight: 500, fontFamily: "monospace" }}>
            {error.message}
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 14, padding: 20, background: "var(--sur)", borderRadius: 16, border: "1px solid var(--bdr)" }}>
              <div className="skel" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skel" style={{ height: 14, width: "60%", marginBottom: 8 }} />
                <div className="skel" style={{ height: 12, width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && data.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "var(--sur)", borderRadius: 20, border: "1px solid var(--bdr)" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h2 style={{ fontSize: "1.125rem", marginBottom: 8 }}>No messages yet</h2>
          <p style={{ color: "var(--tx2)", fontSize: "0.875rem" }}>Start a conversation by contacting a listing owner.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((c, i) => {
          const otherUser = c.user1Id === user.$id ? c.user2Id : c.user1Id;
          return <ConversationCard key={c.$id} conversation={c} otherUserId={otherUser} index={i} onDelete={handleDeleteClick} />;
        })}
      </div>

      {deleteId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 24, animation: "fadeUp 0.2s ease"
        }}>
          <div className="auth-card fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h2 style={{ fontSize: "1.25rem", margin: "0 0 8px" }}>Delete Chat?</h2>
            <p style={{ color: "var(--tx2)", fontSize: "0.875rem", marginBottom: 24 }}>
              This action cannot be undone. Are you sure you want to remove this conversation?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-o" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-p" style={{ background: "var(--p)" }} onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}