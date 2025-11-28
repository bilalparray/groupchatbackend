import crypto from "crypto";
import { sendSuccess, sendError } from "../../Helper/response.helper.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../middlewares/auth/auth.js";
import { GuestKey } from "../../db/dbconnection.js";

// ✅ GENERATE GUEST KEY (Admin / SuperAdmin only)
export const generateGuestKeyController = async (req, res) => {
  try {
    const user = req.user; // coming from verifyToken middleware

    if (!user || !["Admin", "SuperAdmin"].includes(user.role)) {
      return sendError(res, "Forbidden", 403);
    }

    const randomKey = crypto.randomBytes(16).toString("hex"); // 32-char random key

    const guestKey = await GuestKey.create({
      key: randomKey,
      createdBy: user.id,
    });

    return sendSuccess(res, {
      guestKey: guestKey.key,
      createdBy: guestKey.createdBy,
    });
  } catch (err) {
    return sendError(res, err.message || "Failed to generate guest key");
  }
};



// ✅ GUEST LOGIN USING KEY
export const guestLoginWithKeyController = async (req, res) => {
  const { reqData } = req.body;
  const { guestKey } = reqData || {};

  try {
    if (!guestKey) return sendError(res, "Key is required", 400);

    // 🔍 Step 1: Validate key exists
    const keyEntry = await GuestKey.findOne({ where: { key: guestKey } });
    if (!keyEntry) return sendError(res, "Invalid guest key", 404);

    // 🔍 Step 2: Ensure login type is Guest only
    // If frontend passes some loginType
    if (reqData?.loginType && reqData.loginType !== "Guest") {
      return sendError(res, "Only Guest login allowed with this key", 403);
    }

    // 🔍 Step 3: Prepare guest user payload
    const guestUser = {
      id: keyEntry.id,
      username: `Guest-${keyEntry.id}`,
      role: "Guest",
    };

    const accessToken = await generateAccessToken(guestUser);
    const refreshToken = await generateRefreshToken(guestUser);

    return sendSuccess(res, {
      username: guestUser.username,
      role: "Guest",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return sendError(res, err.message || "Login failed");
  }
};


