import dotenv from "dotenv";
// Load environment variables as early as possible so other modules can read them
dotenv.config();

import express, { Application } from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/user-routes.js";
import chatRoutes from "./routes/chat-routes.js";

const app: Application = express();

// -------------------- MIDDLEWARES --------------------
// Configure CORS to allow the frontend origin(s). In development we allow common Vite ports
const allowedOrigins = [
  "https://quantum-bot-zxdh.vercel.app" // only the deployed frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests (like curl, server-to-server) when origin is undefined
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In development, be permissive so local dev servers on new ports still work
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(morgan("dev"));

// -------------------- ROUTES --------------------
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);

// -------------------- MONGODB CONNECTION --------------------
const mongoURI = process.env.MONGO_URI as string;

mongoose
  .connect(mongoURI)
  .then(() => {
    const PORT = process.env.PORT || 5001; // fallback to 5001
    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT} and MongoDB connected`
      );
    });
  })
  .catch((err: Error) => {
    console.error("MongoDB connection error:", err.message);
  });

// -------------------- DEFAULT ROUTE --------------------
app.get("/", (_req, res) => {
  res.send("Backend is running!");
});

// Debug endpoint (non-secret) to verify config without exposing API keys
app.get("/api/debug/config", (_req, res) => {
  const hfConfigured = !!(process.env.HUGGING_FACE_API_KEY || process.env.HF_API_KEY || process.env.HUGGING_FACE_KEY);
  const hfModel = process.env.HUGGING_FACE_MODEL || process.env.HF_MODEL || null;
  const port = process.env.PORT || null;
  return res.status(200).json({ hfConfigured, hfModel, allowedOrigins, port, nodeEnv: process.env.NODE_ENV || "development" });
});

// Central error handler (send stack in development for easier debugging)
app.use((err: any, req: any, res: any, _next: any) => {
  console.error("Unhandled server error:", err);
  if (process.env.NODE_ENV !== "production") {
    return res.status(err.status || 500).json({ message: err.message, stack: err.stack });
  }
  return res.status(err.status || 500).json({ message: "Internal Server Error" });
});
