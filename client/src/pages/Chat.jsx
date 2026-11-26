import { useParams } from "react-router-dom";
import { useMessages } from "../hooks/useMessages";
import { useState, useRef, useEffect } from "react";
import { sendMessage, getUserConversations } from "../services/chat.service";
import { useAuthStore } from "../store/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../services/profile.service";
import { getFilePreview } from "../services/listing.service";

export default function Chat() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { data: messages = [] } = useMessages(id);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Fetch the conversation details to find out who we are talking to
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", user?.$id],
    queryFn: () => getUserConversations(user.$id),
    enabled: !!user,
  });
  const conversation = conversations.find(c => c.$id === id);
  const otherUserId = conversation ? (conversation.user1Id === user.$id ? conversation.user2Id : conversation.user1Id) : null;

  // Fetch the other user's profile
  const { data: profile } = useQuery({
    queryKey: ["profile", otherUserId],
    queryFn: () => getProfile(otherUserId),
    enabled: !!otherUserId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(id, user.$id, text);
      setText("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="wrap" style={{ paddingTop: 24, paddingBottom: 24, maxWidth: 720 }}>
      <div style={{
        background: "var(--sur)", border: "1px solid var(--bdr)",
        borderRadius: 20, boxShadow: "var(--sh2)",
        display: "flex", flexDirection: "column",
        height: "calc(100vh - 120px)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--bdr)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--p), var(--sec))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#fff", fontWeight: 600,
            backgroundImage: profile?.avatarId ? `url(${getFilePreview(profile?.avatarId)})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}>
            {!profile?.avatarId && (profile?.bio ? "U" : "💬")}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem" }}>
              {profile?.name ? profile.name : "Roommate"}
            </h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--p)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--p)", animation: "pulse 2s infinite" }} />
              Live
            </p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--tx3)", fontSize: "0.875rem", marginTop: "auto", marginBottom: "auto" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
              Start the conversation
            </div>
          )}
          {messages.map((m) => {
            const isMe = m.senderId === user.$id;
            return (
              <div key={m.$id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "72%",
                  padding: "10px 16px",
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMe ? "linear-gradient(135deg, var(--p), var(--sec))" : "var(--sur2)",
                  color: isMe ? "#fff" : "var(--tx)",
                  fontSize: "0.9rem",
                  lineHeight: 1.5,
                  boxShadow: isMe ? "0 2px 8px var(--p-glow)" : "var(--sh1)",
                  animation: "fadeUp 0.2s ease both",
                }}>
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--bdr)",
          display: "flex", gap: 10, alignItems: "flex-end",
        }}>
          <textarea
            className="inp"
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ flex: 1, resize: "none", lineHeight: 1.5, maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="btn btn-p"
            style={{ padding: "10px 20px", flexShrink: 0 }}
          >
            {sending ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}