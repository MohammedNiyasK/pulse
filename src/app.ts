import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { initializeSocketIO } from "./socket";
import { createServer } from "http";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import healthCheckRouter from "./routes/healthcheck.routes";
import otpRouter from "./routes/otp.routes";
import userRouter from "./routes/user.routes";
import chatRouter from "./routes/chat.routes";

//routes declaration
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/otp", otpRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/chats", chatRouter);

initializeSocketIO(io);

export { httpServer };
