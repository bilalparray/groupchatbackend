import authRouter from "../routes/auth.routes.js";
import guestKeyRoutes from "../routes/guestKey.route.js";
import groupRoutes from "../routes/group.routes.js";
import messageRoutes from "../routes/message.routes.js";

/**
 * Registers all routes with base paths
 * @param {Express.Application} app 
 * @param {string} baseUrl 
 */
export const registerRoutes = (app, baseUrl = "") => {
  console.log(`[Routes] Registering routes with baseUrl: "${baseUrl}"`);

  // ❗ health route MUST NOT use BASE_URL
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });
  
  app.use(`${baseUrl}`, authRouter);
  app.use(`${baseUrl}`, guestKeyRoutes);
  app.use(`${baseUrl}`, groupRoutes);
  app.use(`${baseUrl}`, messageRoutes);
  
  // Log registered routes for debugging
  console.log(`[Routes] Guest login route: ${baseUrl}/guest-login`);
  console.log(`[Routes] Login route: ${baseUrl}/login`);
  console.log(`[Routes] Groups route: ${baseUrl}/groups`);
};