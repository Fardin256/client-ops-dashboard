import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyAccessToken } from "./utils/jwt";
import prisma from "./utils/prisma";

export const onlineUsers = new Set<string>();
interface AuthedSocket extends Socket {
  user?: {
    userId: string;
    role: "ADMIN" | "PM" | "DEVELOPER";
  };
}

let io: SocketIOServer;

export function initSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Auth middleware for socket connections
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("No token provided"));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket: AuthedSocket) => {
    const user = socket.user!;
    console.log(`[Socket] User connected: ${user.userId} (${user.role})`);

    // Every user joins a personal room, used for direct notifications
    socket.join(`user-${user.userId}`);

    onlineUsers.add(user.userId);
    io.to("admin-global").emit("presence-count", onlineUsers.size);

    if (user.role === "ADMIN") {
      socket.join("admin-global");
    } else if (user.role === "PM") {
      const projects = await prisma.project.findMany({
        where: { creatorId: user.userId },
        select: { id: true },
      });
      projects.forEach((p) => socket.join(`project-${p.id}`));
    } else if (user.role === "DEVELOPER") {
      socket.join(`developer-${user.userId}`);
    }

    // Send last 20 missed activity events on reconnect
    let missedEvents;
    if (user.role === "ADMIN") {
      missedEvents = await prisma.taskActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { task: true, user: true },
      });
    } else if (user.role === "PM") {
      missedEvents = await prisma.taskActivity.findMany({
        where: { project: { creatorId: user.userId } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { task: true, user: true },
      });
    } else {
      missedEvents = await prisma.taskActivity.findMany({
        where: { task: { assigneeId: user.userId } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { task: true, user: true },
      });
    }

    socket.emit("missed-events", missedEvents.reverse());

    socket.on("disconnect", () => {
      console.log(`[Socket] User disconnected: ${user.userId}`);
      onlineUsers.delete(user.userId);
      io.to("admin-global").emit("presence-count", onlineUsers.size);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}