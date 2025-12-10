import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./MainRoute/mainRoutes.js";
import { dbConnection } from "./db/dbconnectionP.js";
import { setupSwagger } from "./swagger/swagger-autosetup.js";

dotenv.config();
const app = express();

// --------------------------------------------------
// ✅ CORS MUST BE FIRST
// --------------------------------------------------
const allowedOrigins = [
  "http://localhost",
  "http://localhost:8100",
  "https://localhost",
  "capacitor://localhost",
  "ionic://localhost",
];
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server requests (no origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "targetapitype",
      "isdeveloperapk",
      "appversion",
    ],
  })
);

// ✅ Preflight (OPTIONS) Fix
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, targetapitype, isdeveloperapk, appversion"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(200);
});

// --------------------------------------------------
// Body & Cookie Parsers
// --------------------------------------------------
app.use(express.json({ limit: "50mb", strict: false }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// --------------------------------------------------
// Register All Routes
// --------------------------------------------------
registerRoutes(app, process.env.BASE_URL);

// --------------------------------------------------
// Health Check
// --------------------------------------------------
app.get("/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// --------------------------------------------------
// Start Server After DB Connection
// --------------------------------------------------
// const startServer = async () => {
//   try {
//     const { sequelize, models } = await dbConnection();
//     console.log("✅ DB connected, starting server...");

//     // Attach models after DB connect
//     app.use((req, res, next) => {
//       req.models = models;
//       next();
//     });

//     const PORT = process.env.PORT || 8081;
//     app.listen(PORT, () => {
//       console.log(
//         `🚀 Server running on port ${PORT} (ENV=${
//           process.env.NODE_ENV || "development"
//         })`
//       );
//     });
//   } catch (err) {
//     console.error("❌ Failed to start server:", err);
//   }
// };

// startServer();

async function start() {
  try {
    // 1) Initialize DB
    await dbConnection(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS
    );

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
