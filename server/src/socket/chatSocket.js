import { prisma } from "../config/db.js";
import { verifySessionToken } from "../middleware/auth.js";

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        return idx === -1
          ? [c, ""]
          : [c.slice(0, idx), decodeURIComponent(c.slice(idx + 1))];
      })
  );
}

export function registerChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers?.cookie);
      const token = cookies.token || socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      socket.user = await verifySessionToken(token);
      return next();
    } catch {
      return next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);

    socket.on("join_conversation", async (conversationId, ack) => {
      try {
        const conv = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [{ user1Id: socket.user.id }, { user2Id: socket.user.id }],
          },
          select: { id: true },
        });
        if (!conv) {
          return ack?.({ ok: false, error: "Forbidden" });
        }
        await socket.join(`conversation:${conversationId}`);
        return ack?.({ ok: true });
      } catch {
        return ack?.({ ok: false, error: "Failed to join conversation" });
      }
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });
  });
}
