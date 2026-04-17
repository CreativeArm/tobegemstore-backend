const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payment");
const userRoutes = require("./routes/users");

const app = express();

const parseOrigins = (...values) =>
  values
    .flatMap((value) => (value || "").split(","))
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

const allowedOrigins = new Set(
  parseOrigins(
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS,
    "http://localhost:3000,http://localhost:5173",
  ),
);

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB Connection (no options needed — driver 4+ handles this automatically)
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/tobegemstore")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/users", userRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "TobegemStore API",
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`🚀 TobegemStore Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(
      `   → On Windows: run  netstat -ano | findstr :${PORT}  then  taskkill /PID <PID> /F`,
    );
    console.error(
      `   → Or change PORT in your .env file to another number (e.g. PORT=5001)\n`,
    );
    process.exit(1);
  } else {
    throw err;
  }
});

module.exports = app;
