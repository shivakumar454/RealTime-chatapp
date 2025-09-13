import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const userSocketMap = {};

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://realtime-chatapp-frontend-pnn9.onrender.com"
    ],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("A user is connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("A user is disconnected", socket.id);
    if (userId) delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export function getReceiveSocketId(userId) {
  return userSocketMap[userId];
}

export { io, app, server };
