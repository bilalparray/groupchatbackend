// index.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import cookie from "cookie-parser";

import { dbConnection } from "./db/dbconnection.js";
import { registerRoutes } from "./MainRoute/mainRoutes.js";
import { setupSwagger } from "./swagger/swagger-autosetup.js";

const app = express();

// -------------------- Middlewares --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: "*",
  })
);

app.use(cookie());



async function start() {
  try {
    // 1) Initialize DB
    await dbConnection(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS);

    // 2) Register ALL ROUTES (BASE_URL applied only here)
    registerRoutes(app, process.env.BASE_URL);

    // 3) Setup Swagger — ❗ NO BASE_URL HERE
    await setupSwagger(app);

    // 4) Start server
    const PORT = process.env.PORT || 8081;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
