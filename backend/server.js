import "dotenv/config";

import cors from "cors";
import express from "express";

import aiRoutes from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import artisanRoutes from "./routes/artisan.js";
import buyerRoutes from "./routes/buyer.js";
import dashboardRoutes from "./routes/dashboard.js";
import enquiryRoutes from "./routes/enquiries.js";
import marketRoutes from "./routes/market.js";
import orderRoutes from "./routes/orders.js";
import productRoutes from "./routes/products.js";
import schemeRoutes from "./routes/schemes.js";
import trainingRoutes from "./routes/training.js";

const app = express();
const port = Number(process.env.PORT ?? 5000);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin requests and curl have no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed by CORS"));
    },
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "H-Connect backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/artisan", artisanRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/market-insights", marketRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = typeof error.status === "number" ? error.status : 500;
  res.status(status).json({ error: error.message ?? "Something went wrong on the server." });
});

app.listen(port, () => {
  console.log(`H-Connect backend listening on http://localhost:${port}`);
});
