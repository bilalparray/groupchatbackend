import express from 'express';
import {
generateGuestKeyController,
guestLoginWithKeyController
} from "../../controller/auth/guestKeyController.js";

import { authenticateToken } from "../../middlewares/auth/auth.js";
const guestKeyRoutes = express.Router();
// ✅ Only Admin / SuperAdmin can generate guest key
guestKeyRoutes.post(
"/generate-guest-key",
authenticateToken,
generateGuestKeyController
);

// ✅ Guest login does NOT require token (public)
guestKeyRoutes.post(
"/guest-login",
guestLoginWithKeyController
);

export default guestKeyRoutes;
