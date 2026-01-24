import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import compression from "compression";
import path from "path";

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT;

const __dirname = path.resolve();

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:5001",
  `${process.env.LIVE_URL}`,
]);

// Enable gzip compression for all responses (reduces transfer size by ~70%)
app.use(compression());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      return cb(null, ALLOWED_ORIGINS.has(origin));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

if (process.env.NODE_ENV === "production") {
  // Serve static files with long cache for hashed assets
  app.use(
    express.static(path.join(__dirname, "../frontend/dist"), {
      maxAge: "1y", // Cache hashed assets for 1 year
      etag: true,
      setHeaders: (res, filePath) => {
        // Don't cache index.html (it references the hashed assets)
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    })
  );

  app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Connect to DB first, then start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
};

startServer();
