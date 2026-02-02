/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management APIs
 */

import express from "express";
import {
  getMessagesController,
  sendMessageController,
  searchMessagesController,
} from "../controller/chat/messageController.js";
import { authenticateToken } from "../middlewares/auth/auth.js";

const messageRoutes = express.Router();

/**
 * @swagger
 * /messages:
 *   get:
 *     tags: [Messages]
 *     description: Get messages for a group
 *     security:
 *       - bearerAuth: []
 */
messageRoutes.get("/messages", authenticateToken, getMessagesController);

/**
 * @swagger
 * /messages:
 *   post:
 *     tags: [Messages]
 *     description: Send a message
 *     security:
 *       - bearerAuth: []
 */
messageRoutes.post("/messages", authenticateToken, sendMessageController);

/**
 * @swagger
 * /messages/search:
 *   post:
 *     tags: [Messages]
 *     description: Search messages
 *     security:
 *       - bearerAuth: []
 */
messageRoutes.post(
  "/messages/search",
  authenticateToken,
  searchMessagesController
);

export default messageRoutes;
