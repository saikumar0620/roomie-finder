import { prisma } from "../config/db.js";
import { verifySessionToken } from "../middleware/auth.js";

// Track active Socket.IO connections per userId for real-time online presence
const onlineUsers = new Map();

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
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    const sockets = onlineUsers.get(userId);
    const becameOnline = sockets.size === 0;
    sockets.add(socket.id);

    if (becameOnline) {
      socket.broadcast.emit("user_online", { userId });
    }

    socket.on("get_online_users", (ack) => {
      ack?.(Array.from(onlineUsers.keys()));
    });

    socket.on("join_conversation", async (conversationId, ack) => {
      try {
        const conv = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [{ user1Id: userId }, { user2Id: userId }],
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

    socket.on("typing", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        conversationId,
        userId,
      });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
        conversationId,
        userId,
      });
    });

    socket.on("disconnect", () => {
      const userSockets = onlineUsers.get(userId);
      if (!userSockets) return;
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user_offline", { userId });
      }
    });
  });
}
