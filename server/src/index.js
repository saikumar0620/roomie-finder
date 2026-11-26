import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { createApp } from "./app.js";
import { registerChatSocket } from "./socket/chatSocket.js";

const app = createApp();
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.clientUrl,
    credentials: true,
  },
});

app.set("io", io);
registerChatSocket(io);

httpServer.listen(env.port, () => {
  console.log(`Roomie Finder API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  console.log("Shutting down gracefully...");
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
