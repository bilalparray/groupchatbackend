import router from "../route/auth/auth.routes.js";
import guestKeyRoutes from "../route/auth/guestKey.route.js"
/**
 * Registers all routes with base paths
 * @param {Express.Application} app 
 * @param {string} baseUrl 
 */
export const registerRoutes = (app, baseUrl = "") => {
  app.use(`${baseUrl}`, router);
  app.use(`${baseUrl}`,guestKeyRoutes)
};
