/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group management APIs
 */

import express from "express";
import {
  getGroupsController,
  createGroupController,
  generateInviteKeyController,
  joinGroupWithInviteKeyController,
} from "../controller/chat/groupController.js";
import { authenticateToken } from "../middlewares/auth/auth.js";

const groupRoutes = express.Router();

/**
 * @swagger
 * /groups:
 *   get:
 *     tags: [Groups]
 *     description: Get all groups for the authenticated user
 *     security:
 *       - bearerAuth: []
 */
groupRoutes.get("/groups", authenticateToken, getGroupsController);

/**
 * @swagger
 * /groups:
 *   post:
 *     tags: [Groups]
 *     description: Create a new group
 *     security:
 *       - bearerAuth: []
 */
groupRoutes.post("/groups", authenticateToken, createGroupController);

/**
 * @swagger
 * /groups/{id}/invite-key:
 *   post:
 *     tags: [Groups]
 *     description: Generate new invite key for a group
 *     security:
 *       - bearerAuth: []
 */
groupRoutes.post(
  "/groups/:id/invite-key",
  authenticateToken,
  generateInviteKeyController
);

/**
 * @swagger
 * /groups/join/{inviteKey}:
 *   post:
 *     tags: [Groups]
 *     description: Join a group using invite key
 *     security:
 *       - bearerAuth: []
 */
groupRoutes.post(
  "/groups/join/:inviteKey",
  authenticateToken,
  joinGroupWithInviteKeyController
);

export default groupRoutes;
