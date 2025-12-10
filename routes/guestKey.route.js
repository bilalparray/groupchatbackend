/**
 * @swagger
 * tags:
 *   name: GuestKey
 *   description: Guest key and guest login APIs
 */

import express from 'express';
import {
  generateGuestKeyController,
  guestLoginWithKeyController,
  updateGuestStatusController,
} from "../controller/auth/guestKeyController.js";

import { authenticateToken } from "../middlewares/auth/auth.js";

const guestKeyRoutes = express.Router();

/**
 * @swagger
 * /generate-guest-key:
 *   post:
 *     tags: [GuestKey]
 *     description: Generate guest key (Admin only)
 */
guestKeyRoutes.post(
  "/generate-guest-key",
  authenticateToken,
  generateGuestKeyController
);

/**
 * @swagger
 * /guest-login:
 *   post:
 *     tags: [GuestKey]
 *     description: Guest login using guest key
 */
guestKeyRoutes.post(
  "/guest-login",
  guestLoginWithKeyController
);

/**
 * @swagger
 * /guestkey/status:
 *   post:
 *     tags: [GuestKey]
 *     description: Update guest key status
 */
guestKeyRoutes.post(
  "/guestkey/status",
  authenticateToken,
  updateGuestStatusController
);

export default guestKeyRoutes;
