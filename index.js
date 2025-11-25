import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
import cookie from "cookie-parser";
import { dbConnection } from "./db/dbconnection.js";
import { registerRoutes } from "./MainRoute/mainRoutes.js";
const app = express();
// ✅ Use built-in Express body parsers (no body-parser)
app.use(express.json({ limit: "50mb", strict: false })); // strict:false lets "null" pass if sent
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: "*",
  })
);

// Middleware
app.use(cookie());
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
// ✅ Register all routes via single function
registerRoutes(app, process.env.BASE_URL);



// Local Database connection
dbConnection(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS);

app.listen(process.env.PORT, () => {
  console.log(`Server is running at port ${process.env.PORT}`);
});
