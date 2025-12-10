import authRouter from "../routes/auth.routes.js";
import guestKeyRoutes from "../routes/guestKey.route.js";

/**
 * Registers all routes with base paths
 * @param {Express.Application} app
 * @param {string} baseUrl
 */
export const registerRoutes = (app, baseUrl = "") => {
  // ❗ health route MUST NOT use BASE_URL
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/", (req, res) => {
    res.redirect("/docs");
  });

  app.use(`${baseUrl}`, authRouter);
  app.use(`${baseUrl}`, guestKeyRoutes);
};
