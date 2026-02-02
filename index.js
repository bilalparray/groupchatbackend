// index.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();
import cors from "cors";
import cookie from "cookie-parser";
import os from "os";

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
    const baseUrl = process.env.BASE_URL || "/api/v1";
    console.log(`[Server] Using BASE_URL: "${baseUrl}"`);
    registerRoutes(app, baseUrl);

    // 3) Setup Swagger — ❗ NO BASE_URL HERE
    await setupSwagger(app);

    // 4) Start server - Listen on all network interfaces (0.0.0.0)
    const PORT = process.env.PORT || 8081;
    const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces
    
    app.listen(PORT, HOST, () => {
      // Get local IP address
      const networkInterfaces = os.networkInterfaces();
      let localIP = 'localhost';
      
      // Find the first non-internal IPv4 address
      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIP = iface.address;
            break;
          }
        }
        if (localIP !== 'localhost') break;
      }
      
      console.log(`🚀 Server running at:`);
      console.log(`   Local:   http://localhost:${PORT}`);
      console.log(`   Network: http://${localIP}:${PORT}`);
      console.log(`   Access from other devices using: http://${localIP}:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
