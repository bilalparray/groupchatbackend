import router from "../route/auth/auth.routes.js";
import express from "express";   
/**
 * Registers all routes with base paths
 * @param {Express.Application} app 
 * @param {string} baseUrl 
 */
export const registerRoutes = (app, baseUrl = "") => {
  app.use(`${baseUrl}`, router);
};
